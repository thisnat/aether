/**
 * Aether WebSocket Real-Time Local Network Sync
 */

class NetworkSocket {
  constructor(options = {}) {
    this.options = options;
    this.ws = null;
    this.clientId = null;
    this.peerCount = 1;
    this.reconnectTimer = null;
    this.isConnecting = false;

    this.onPeerCount = options.onPeerCount || (() => {});
    this.onNoteSaved = options.onNoteSaved || (() => {});
    this.onTreeChanged = options.onTreeChanged || (() => {});
    this.onExternalChange = options.onExternalChange || (() => {});

    this.connect();
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) return;
    this.isConnecting = true;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        clearTimeout(this.reconnectTimer);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('Socket message parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        // Auto-reconnect after 2 seconds
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.connect();
        }, 2000);
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch (err) {
      this.isConnecting = false;
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, 3000);
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case 'connected':
        this.clientId = data.clientId;
        this.peerCount = data.peerCount || 1;
        this.onPeerCount(this.peerCount);
        break;

      case 'peer:count':
        this.peerCount = data.count || 1;
        this.onPeerCount(this.peerCount);
        break;

      case 'note:saved':
        this.onNoteSaved(data);
        break;

      case 'tree:changed':
        this.onTreeChanged(data);
        break;

      case 'vault:external_change':
        this.onExternalChange(data);
        break;

      default:
        break;
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

if (typeof window !== 'undefined') {
  window.NetworkSocket = NetworkSocket;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NetworkSocket;
}
