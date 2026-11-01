const { WebSocketServer } = require('ws');
const { isLoopbackAddress } = require('../utils/network');

class WebSocketService {
  constructor(server, networkService = null) {
    this.networkService = networkService;
    this.wss = new WebSocketServer({ server });
    this.setupListeners();
  }

  setNetworkService(networkService) {
    this.networkService = networkService;
  }

  get peerCount() {
    return this.wss.clients.size;
  }

  setupListeners() {
    this.wss.on('connection', (ws, req) => {
      const forwarded = req?.headers?.['x-forwarded-for'];
      const remoteIp = forwarded ? forwarded.split(',')[0].trim() : req?.socket?.remoteAddress;
      ws.remoteIp = remoteIp;
      ws.isLocal = isLoopbackAddress(remoteIp);

      // Deny non-local connections when network sharing is disabled
      if (!ws.isLocal && this.networkService && !this.networkService.isSharingEnabled) {
        try {
          ws.send(
            JSON.stringify({
              type: 'network:disabled',
              message: 'Local network sharing is disabled by host.',
            })
          );
          ws.close(1008, 'Network sharing disabled');
          ws.terminate();
        } catch {}
        return;
      }

      ws.clientId = 'peer_' + Math.random().toString(36).substring(2, 9);

      // Send initial welcome & peer count
      ws.send(
        JSON.stringify({
          type: 'connected',
          clientId: ws.clientId,
          peerCount: this.peerCount,
          sharingEnabled: this.networkService ? this.networkService.isSharingEnabled : false,
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

  onSharingChanged(enabled) {
    if (!enabled) {
      for (const client of this.wss.clients) {
        if (!client.isLocal) {
          try {
            client.send(
              JSON.stringify({
                type: 'network:disabled',
                message: 'Host disabled local network sharing.',
              })
            );
            client.close(1008, 'Network sharing disabled');
            client.terminate();
          } catch {}
        }
      }
    }

    this.broadcast({
      type: 'network:sharing',
      sharingEnabled: enabled,
      peerCount: this.peerCount,
    });
  }

  close() {
    this.wss.close();
  }
}

module.exports = WebSocketService;
