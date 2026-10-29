/**
 * WebSocket client for local network real-time sync
 */

export class NetworkSocket {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.ws = null;
    this.clientId = null;
    this.reconnectTimer = null;
    this.isConnecting = false;
    this.shouldReconnect = true;

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
        if (this.shouldReconnect) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.connect(), 2000);
        }
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch {
      this.isConnecting = false;
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case 'connected':
        this.clientId = data.clientId;
        this.handlers.onConnected?.(data.clientId, data.peerCount);
        this.handlers.onPeerCount?.(data.peerCount || 1);
        break;

      case 'peer:count':
        this.handlers.onPeerCount?.(data.count || 1);
        break;

      case 'note:saved':
        this.handlers.onNoteSaved?.(data);
        break;

      case 'tree:changed':
        this.handlers.onTreeChanged?.(data);
        break;

      case 'vault:external_change':
        this.handlers.onExternalChange?.(data);
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

  destroy() {
    this.shouldReconnect = false;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
    }
  }
}
