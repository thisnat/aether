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
}

module.exports = NetworkController;
