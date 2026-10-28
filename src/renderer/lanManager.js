// ==============================================================================
// Apex Brawl: Client LAN Multiplayer Manager
// High-performance WebSocket networking, zero-lag input sync & state authority
// ==============================================================================

class LANManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.role = null;       // 'HOST' | 'CLIENT'
    this.playerNum = 1;     // 1 for Host, 2 for Client
    this.opponentName = 'Opponent';
    this.pingMs = 0;
    this.pingTimer = null;
    this.listeners = new Map();

    // Latest received opponent input
    this.latestOpponentInput = {
      up: false,
      upJustDown: false,
      down: false,
      left: false,
      right: false,
      isHoldingForward: false,
      lightJustDown: false,
      mediumJustDown: false,
      heavyJustDown: false,
      specialJustDown: false,
      superJustDown: false,
      dashJustDown: false,
      tauntJustDown: false
    };

    // Latest state sync from Host (used by Client for reconciliation)
    this.latestStateSync = null;
  }

  // Connect to Host WebSocket Server (e.g. 192.168.1.50:8765 or 127.0.0.1:8765)
  connect(ip, port = 8765) {
    return new Promise((resolve, reject) => {
      this.disconnect();

      const cleanIP = ip.trim().replace(/^ws:\/\//, '');
      const wsUrl = `ws://${cleanIP}:${port}`;
      console.log(`[LAN Manager] Connecting to ${wsUrl}...`);

      let connectionTimeout = setTimeout(() => {
        if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
          this.socket.close();
          reject(new Error(`Connection to ${wsUrl} timed out.`));
        }
      }, 5000);

      try {
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.startPingLoop();
          console.log('[LAN Manager] Connected to LAN server!');
          this.emit('connected', { url: wsUrl });
          resolve({ success: true, url: wsUrl });
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleIncomingMessage(data);
          } catch (e) {
            console.error('[LAN Manager Parse Error]', e);
          }
        };

        this.socket.onclose = () => {
          clearTimeout(connectionTimeout);
          this.stopPingLoop();
          this.isConnected = false;
          console.log('[LAN Manager] Disconnected from LAN server');
          this.emit('disconnected');
        };

        this.socket.onerror = (err) => {
          clearTimeout(connectionTimeout);
          console.error('[LAN Manager Socket Error]', err);
          this.emit('error', err);
          reject(err);
        };
      } catch (e) {
        clearTimeout(connectionTimeout);
        reject(e);
      }
    });
  }

  handleIncomingMessage(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'ROLE_ASSIGNED':
        this.role = data.role;
        this.playerNum = data.playerNum;
        console.log(`[LAN Manager] Role assigned: ${this.role} (Player ${this.playerNum})`);
        break;

      case 'PEER_JOINED':
        console.log('[LAN Manager] Peer joined the match!');
        break;

      case 'PING':
        // Reply with PONG
        this.send('PONG', { sendTime: data.sendTime });
        return;

      case 'PONG':
        if (data.sendTime) {
          this.pingMs = Math.max(1, Date.now() - data.sendTime);
          this.emit('ping', this.pingMs);
        }
        return;

      case 'PLAYER_INPUT':
        if (data.input) {
          this.latestOpponentInput = data.input;
        }
        break;

      case 'STATE_SYNC':
        this.latestStateSync = data;
        break;
    }

    // Dispatch to registered event listeners
    this.emit(data.type, data);
  }

  send(type, payload = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type,
        ...payload,
        playerNum: this.playerNum,
        timestamp: Date.now()
      }));
    }
  }

  startPingLoop() {
    this.stopPingLoop();
    this.pingTimer = setInterval(() => {
      this.send('PING', { sendTime: Date.now() });
    }, 2000);
  }

  stopPingLoop() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  disconnect() {
    this.stopPingLoop();
    if (this.socket) {
      try { this.socket.close(); } catch (_) { }
      this.socket = null;
    }
    this.isConnected = false;
    this.role = null;
    this.latestStateSync = null;
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
  }

  off(type, callback) {
    if (this.listeners.has(type)) {
      const arr = this.listeners.get(type).filter(cb => cb !== callback);
      this.listeners.set(type, arr);
    }
  }

  emit(type, data) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).forEach(cb => {
        try { cb(data); } catch (err) { console.error(`[LAN Listener Error: ${type}]`, err); }
      });
    }
  }
}

// Global singleton instance
window.lanManager = new LANManager();
