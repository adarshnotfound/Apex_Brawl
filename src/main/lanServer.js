// ==============================================================================
// Apex Brawl: Local Area Network (LAN) Multiplayer Server & Discovery Engine
// Supports WebSocket relay (P1 Host <-> P2 Client) + UDP Auto-Discovery Beacon
// ==============================================================================

const os = require('os');
const dgram = require('dgram');
const { WebSocketServer, WebSocket } = require('ws');

const DEFAULT_PORT = 8765;
const BROADCAST_PORT = 8766;
const BROADCAST_INTERVAL_MS = 1500;

class LANServer {
  constructor() {
    this.wss = null;
    this.hostSocket = null;
    this.clientSocket = null;
    this.port = DEFAULT_PORT;

    this.udpBeaconSocket = null;
    this.beaconTimer = null;
    this.udpDiscoverySocket = null;

    this.onStateChangeCallback = null;
  }

  // Get primary active non-internal IPv4 address (e.g. 192.168.x.x, 10.x.x.x)
  getLocalIP() {
    const ifaces = os.networkInterfaces();
    let fallback = '127.0.0.1';

    for (const name in ifaces) {
      for (const net of ifaces[name]) {
        // Skip internal (127.0.0.1) and non-IPv4 addresses
        if (net.family === 'IPv4' && !net.internal) {
          // Prefer standard LAN subnets (192.168, 10., 172.16-31)
          if (net.address.startsWith('192.168.') || net.address.startsWith('10.') || net.address.startsWith('172.')) {
            return net.address;
          }
          fallback = net.address;
        }
      }
    }
    return fallback;
  }

  // Start WebSocket Host Server
  startHost(port = DEFAULT_PORT, onEvent) {
    this.stopHost();
    this.port = port;
    this.onEvent = onEvent;

    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port }, () => {
          const localIP = this.getLocalIP();
          console.log(`[LAN Server] Running on ${localIP}:${this.port}`);

          // Start automatic UDP Beacon broadcast for zero-config discovery
          this.startUDPBeacon(localIP, this.port);

          resolve({
            success: true,
            ip: localIP,
            port: this.port,
            hostname: os.hostname()
          });
        });

        this.wss.on('connection', (ws, req) => {
          this.handleConnection(ws, req);
        });

        this.wss.on('error', (err) => {
          console.error('[LAN Server Error]', err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  handleConnection(ws, req) {
    const isLocalhost = req.socket.remoteAddress === '127.0.0.1' || req.socket.remoteAddress === '::1' || req.socket.remoteAddress === '::ffff:127.0.0.1';

    // Assign roles: First connection from localhost is usually Host (P1)
    if (!this.hostSocket && isLocalhost) {
      this.hostSocket = ws;
      ws.role = 'HOST';
      ws.playerNum = 1;
      this.sendTo(ws, { type: 'ROLE_ASSIGNED', role: 'HOST', playerNum: 1 });
      console.log('[LAN Server] Host player (P1) connected');
    } else if (!this.clientSocket) {
      this.clientSocket = ws;
      ws.role = 'CLIENT';
      ws.playerNum = 2;
      this.sendTo(ws, { type: 'ROLE_ASSIGNED', role: 'CLIENT', playerNum: 2 });
      console.log('[LAN Server] Client player (P2) connected from', req.socket.remoteAddress);

      // Notify host that challenger has joined
      if (this.hostSocket && this.hostSocket.readyState === WebSocket.OPEN) {
        this.sendTo(this.hostSocket, {
          type: 'PEER_JOINED',
          remoteAddress: req.socket.remoteAddress,
          playerNum: 2
        });
      }
      // Also notify client that host is ready
      this.sendTo(this.clientSocket, {
        type: 'PEER_JOINED',
        playerNum: 1,
        hostname: os.hostname()
      });
    } else {
      // Lobby is full (max 2 players for 1v1 Kombat)
      this.sendTo(ws, { type: 'ERROR', message: 'LAN Match is already full (2/2 Players)' });
      ws.close();
      return;
    }

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Echo/relay messages between Host and Client
        if (ws.role === 'HOST') {
          if (this.clientSocket && this.clientSocket.readyState === WebSocket.OPEN) {
            this.sendTo(this.clientSocket, msg);
          }
        } else if (ws.role === 'CLIENT') {
          if (this.hostSocket && this.hostSocket.readyState === WebSocket.OPEN) {
            this.sendTo(this.hostSocket, msg);
          }
        }
      } catch (e) {
        console.error('[LAN Message Parse Error]', e);
      }
    });

    ws.on('close', () => {
      console.log(`[LAN Server] ${ws.role} disconnected`);
      if (ws === this.hostSocket) {
        this.hostSocket = null;
        if (this.clientSocket && this.clientSocket.readyState === WebSocket.OPEN) {
          this.sendTo(this.clientSocket, { type: 'PEER_DISCONNECTED', role: 'HOST' });
        }
      } else if (ws === this.clientSocket) {
        this.clientSocket = null;
        if (this.hostSocket && this.hostSocket.readyState === WebSocket.OPEN) {
          this.sendTo(this.hostSocket, { type: 'PEER_DISCONNECTED', role: 'CLIENT' });
        }
      }
    });
  }

  sendTo(ws, obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  // Stop WebSocket Host Server
  stopHost() {
    this.stopUDPBeacon();

    if (this.hostSocket) {
      try { this.hostSocket.close(); } catch (_) { }
      this.hostSocket = null;
    }
    if (this.clientSocket) {
      try { this.clientSocket.close(); } catch (_) { }
      this.clientSocket = null;
    }
    if (this.wss) {
      try { this.wss.close(); } catch (_) { }
      this.wss = null;
      console.log('[LAN Server] Stopped');
    }
  }

  // --- UDP Zero-Config Discovery Beacon (Host Advertises on LAN) ---
  startUDPBeacon(ip, port) {
    this.stopUDPBeacon();
    try {
      this.udpBeaconSocket = dgram.createSocket('udp4');
      this.udpBeaconSocket.bind(() => {
        this.udpBeaconSocket.setBroadcast(true);

        const beaconData = Buffer.from(JSON.stringify({
          app: 'APEX_BRAWL_LAN',
          version: '1.0',
          hostname: os.hostname(),
          ip: ip,
          port: port
        }));

        this.beaconTimer = setInterval(() => {
          if (this.udpBeaconSocket) {
            // Broadcast to 255.255.255.255
            this.udpBeaconSocket.send(beaconData, 0, beaconData.length, BROADCAST_PORT, '255.255.255.255', (err) => {
              if (err && err.code !== 'ENETUNREACH') {
                // Ignore transient network errors
              }
            });
          }
        }, BROADCAST_INTERVAL_MS);
      });
    } catch (e) {
      console.warn('[UDP Beacon Warning]', e);
    }
  }

  stopUDPBeacon() {
    if (this.beaconTimer) {
      clearInterval(this.beaconTimer);
      this.beaconTimer = null;
    }
    if (this.udpBeaconSocket) {
      try { this.udpBeaconSocket.close(); } catch (_) { }
      this.udpBeaconSocket = null;
    }
  }

  // --- UDP Discovery Listener (Client scans for Hosts on LAN) ---
  startDiscovery(onHostFound) {
    this.stopDiscovery();
    try {
      this.udpDiscoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.udpDiscoverySocket.on('error', (err) => {
        console.warn('[UDP Discovery Error]', err);
      });

      this.udpDiscoverySocket.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data && data.app === 'APEX_BRAWL_LAN') {
            onHostFound({
              hostname: data.hostname,
              ip: data.ip || rinfo.address,
              port: data.port || DEFAULT_PORT,
              rinfoAddress: rinfo.address,
              lastSeen: Date.now()
            });
          }
        } catch (_) { }
      });

      this.udpDiscoverySocket.bind(BROADCAST_PORT, () => {
        try {
          this.udpDiscoverySocket.setBroadcast(true);
          console.log(`[LAN Discovery] Listening for game broadcasts on UDP port ${BROADCAST_PORT}`);
        } catch (_) { }
      });
    } catch (e) {
      console.warn('[UDP Discovery Init Warning]', e);
    }
  }

  stopDiscovery() {
    if (this.udpDiscoverySocket) {
      try { this.udpDiscoverySocket.close(); } catch (_) { }
      this.udpDiscoverySocket = null;
      console.log('[LAN Discovery] Stopped listening');
    }
  }
}

module.exports = new LANServer();
