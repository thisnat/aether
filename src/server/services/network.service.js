const qrcode = require('qrcode');
const { getNetworkAddresses } = require('../utils/network');

class NetworkService {
  constructor(port, vaultPath, initialSharing = false) {
    this.port = port;
    this.vaultPath = vaultPath;
    this.sharingEnabled = Boolean(initialSharing);
    this.cachedInfo = null;
  }

  get isSharingEnabled() {
    return this.sharingEnabled;
  }

  setSharing(enabled) {
    this.sharingEnabled = Boolean(enabled);
    return this.sharingEnabled;
  }

  async getNetworkInfo(peerCount = 1) {
    if (!this.cachedInfo) {
      const { primaryIp, allIps } = getNetworkAddresses();
      const localUrl = `http://localhost:${this.port}`;
      const networkUrl = `http://${primaryIp}:${this.port}`;

      let qrDataUrl = null;
      try {
        qrDataUrl = await qrcode.toDataURL(networkUrl, {
          margin: 1.5,
          width: 280,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
      } catch (err) {
        console.error('Error generating QR code:', err);
      }

      this.cachedInfo = {
        port: this.port,
        primaryIp,
        allIps,
        localUrl,
        networkUrl,
        qrDataUrl,
        vaultPath: this.vaultPath,
      };
    }

    return {
      ...this.cachedInfo,
      sharingEnabled: this.sharingEnabled,
      peerCount,
    };
  }
}

module.exports = NetworkService;
