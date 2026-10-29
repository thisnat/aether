const { WebSocketServer } = require('ws');

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocketServer({ server });
    this.setupListeners();
  }

  get peerCount() {
    return this.wss.clients.size;
  }

  setupListeners() {
    this.wss.on('connection', (ws) => {
      ws.clientId = 'peer_' + Math.random().toString(36).substring(2, 9);

      // Send initial welcome & peer count
      ws.send(
        JSON.stringify({
          type: 'connected',
          clientId: ws.clientId,
          peerCount: this.peerCount,
        })
      );

      this.broadcastPeerCount();

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'note:typing') {
            this.broadcast(
              {
                type: 'note:typing',
                path: data.path,
                user: data.user || 'Peer',
                senderId: ws.clientId,
              },
              ws.clientId
            );
          }
        } catch {
          // Ignore invalid JSON
        }
      });

      ws.on('close', () => {
        this.broadcastPeerCount();
      });
    });
  }

  broadcast(data, excludeSenderId = null) {
    const payload = JSON.stringify(data);
    for (const client of this.wss.clients) {
      if (client.readyState === 1) {
        // OPEN
        if (excludeSenderId && client.clientId === excludeSenderId) {
          continue;
        }
        client.send(payload);
      }
    }
  }

  broadcastPeerCount() {
    this.broadcast({
      type: 'peer:count',
      count: this.peerCount,
    });
  }

  close() {
    this.wss.close();
  }
}

module.exports = WebSocketService;
