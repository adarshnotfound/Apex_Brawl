// ==============================================================================
// Apex Brawl: Mobile Controller Server & WebSocket Bridge
// Hosts a zero-install touch gamepad web app on local Wi-Fi and bridges
// real-time inputs into the desktop game engine with <5ms latency.
// ==============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');

const DEFAULT_PORT = 3000;

class MobileControllerServer {
  constructor(mainWindow, preferredPort = DEFAULT_PORT) {
    this.mainWindow = mainWindow;
    this.port = preferredPort;
    this.server = null;
    this.wss = null;

    this.clients = new Map(); // socket -> { id, player, deviceName }
    this.p1Socket = null;
    this.p2Socket = null;
  }

  // Get primary active non-internal IPv4 address (Wi-Fi or LAN Ethernet)
  getLocalIP() {
    const ifaces = os.networkInterfaces();
    let fallback = '127.0.0.1';

    for (const name in ifaces) {
      for (const net of ifaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          if (net.address.startsWith('192.168.') || net.address.startsWith('10.') || net.address.startsWith('172.')) {
            return net.address;
          }
          fallback = net.address;
        }
      }
    }
    return fallback;
  }

  start() {
    const localIP = this.getLocalIP();

    // 1. HTTP Server to serve mobile controller web app
    this.server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      // Serve static assets or index.html
      if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/controller') {
        const filePath = path.join(__dirname, '../mobile/index.html');
        fs.readFile(filePath, 'utf-8', (err, data) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading mobile controller page');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data);
        });
        return;
      }

      if (url.pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.getStatusInfo()));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    // 2. Attach WebSocket Server
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const requestedPlayer = url.searchParams.get('p') || url.searchParams.get('player');
      const userAgent = req.headers['user-agent'] || 'Mobile Phone';
      const deviceName = userAgent.includes('iPhone') ? 'iPhone'
                       : userAgent.includes('iPad') ? 'iPad'
                       : userAgent.includes('Android') ? 'Android Device'
                       : 'Phone';

      // Assign Player Slot (1 or 2)
      let assignedPlayer = 1;
      if (requestedPlayer === '2') {
        assignedPlayer = 2;
        this.p2Socket = ws;
      } else if (requestedPlayer === '1') {
        assignedPlayer = 1;
        this.p1Socket = ws;
      } else {
        // Auto slot: if P1 is taken, assign P2
        if (!this.p1Socket || this.p1Socket.readyState !== 1) {
          assignedPlayer = 1;
          this.p1Socket = ws;
        } else {
          assignedPlayer = 2;
          this.p2Socket = ws;
        }
      }

      const clientInfo = { player: assignedPlayer, deviceName: deviceName };
      this.clients.set(ws, clientInfo);

      console.log(`[Mobile Server] ${deviceName} connected as Player ${assignedPlayer}`);

      // Send initial welcome & assignment to phone
      ws.send(JSON.stringify({
        type: 'assigned',
        player: assignedPlayer,
        deviceName: deviceName,
        serverTime: Date.now()
      }));

      // Broadcast updated status to Electron desktop window
      this.notifyRendererStatus();

      // Handle incoming touch/gamepad inputs from phone
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);

          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', clientTime: data.time, serverTime: Date.now() }));
            return;
          }

          if (data.type === 'switch_player') {
            const newPlayer = (clientInfo.player === 1) ? 2 : 1;
            if (clientInfo.player === 1 && this.p1Socket === ws) this.p1Socket = null;
            if (clientInfo.player === 2 && this.p2Socket === ws) this.p2Socket = null;

            clientInfo.player = newPlayer;
            if (newPlayer === 1) this.p1Socket = ws;
            else this.p2Socket = ws;

            ws.send(JSON.stringify({
              type: 'assigned',
              player: newPlayer,
              deviceName: clientInfo.deviceName
            }));
            this.notifyRendererStatus();
            return;
          }

          if (data.type === 'input') {
            // Forward input payload directly to Electron renderer window
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send('mobile:input', {
                player: clientInfo.player,
                key: data.key,
                isDown: Boolean(data.isDown)
              });
            }
          }
        } catch (err) {
          console.warn('[Mobile Server] Error parsing packet:', err);
        }
      });

      ws.on('close', () => {
        if (this.p1Socket === ws) this.p1Socket = null;
        if (this.p2Socket === ws) this.p2Socket = null;
        this.clients.delete(ws);
        console.log(`[Mobile Server] Player ${clientInfo.player} disconnected`);
        this.notifyRendererStatus();
      });

      ws.on('error', (err) => {
        console.warn(`[Mobile Server] WS Error:`, err);
      });
    });

    // Handle port in use gracefully
    this.server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[Mobile Server] Port ${this.port} in use, trying ${this.port + 1}...`);
        this.port += 1;
        this.server.listen(this.port, '0.0.0.0');
      } else {
        console.error('[Mobile Server] Server error:', err);
      }
    });

    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`[Mobile Server] Running at http://${localIP}:${this.port}`);
    });
  }

  getStatusInfo() {
    const localIP = this.getLocalIP();
    return {
      localIP,
      port: this.port,
      p1Url: `http://${localIP}:${this.port}?p=1`,
      p2Url: `http://${localIP}:${this.port}?p=2`,
      generalUrl: `http://${localIP}:${this.port}`,
      p1Connected: Boolean(this.p1Socket && this.p1Socket.readyState === 1),
      p2Connected: Boolean(this.p2Socket && this.p2Socket.readyState === 1),
      p1Device: this.p1Socket ? this.clients.get(this.p1Socket)?.deviceName : null,
      p2Device: this.p2Socket ? this.clients.get(this.p2Socket)?.deviceName : null
    };
  }

  async getInfoWithQR() {
    const info = this.getStatusInfo();
    try {
      // Generate Cyan QR Code for P1, Crimson QR Code for P2
      info.p1QR = await QRCode.toDataURL(info.p1Url, {
        margin: 1,
        width: 220,
        color: { dark: '#06b6d4', light: '#0d0f17' }
      });
      info.p2QR = await QRCode.toDataURL(info.p2Url, {
        margin: 1,
        width: 220,
        color: { dark: '#ef4444', light: '#0d0f17' }
      });
    } catch (e) {
      console.error('[Mobile Server] Failed generating QR:', e);
    }
    return info;
  }

  notifyRendererStatus() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('mobile:status', this.getStatusInfo());
    }
  }

  stop() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

module.exports = MobileControllerServer;

