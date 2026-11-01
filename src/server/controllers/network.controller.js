class NetworkController {
  constructor(networkService, wsService) {
    this.networkService = networkService;
    this.ws = wsService;
  }

  getNetworkInfo = async (req, res) => {
    try {
      const info = await this.networkService.getNetworkInfo(this.ws.peerCount);
      res.json(info);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  setSharing = async (req, res) => {
    try {
      const { enabled } = req.body || {};
      const newState =
        typeof enabled === 'boolean' ? enabled : !this.networkService.isSharingEnabled;
      this.networkService.setSharing(newState);

      if (this.ws && typeof this.ws.onSharingChanged === 'function') {
        this.ws.onSharingChanged(newState);
      }

      if (newState) {
        console.log(
          `\x1b[32m✔ Local network sharing enabled: http://${this.networkService.cachedInfo?.primaryIp || 'network'}:${this.networkService.port}\x1b[0m`
        );
      } else {
        console.log('\x1b[33m⚠ Local network sharing disabled. Localhost only.\x1b[0m');
      }

      const info = await this.networkService.getNetworkInfo(this.ws.peerCount);
      res.json({ success: true, sharingEnabled: newState, ...info });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = NetworkController;
