// Backward compatibility bridge
const { getNetworkAddresses } = require('../src/server/utils/network');
const { printStartupBanner } = require('../src/server/utils/banner');
const NetworkService = require('../src/server/services/network.service');

const defaultService = new NetworkService(3000, '');

module.exports = {
  getNetworkAddresses,
  printStartupBanner,
  generateQrDataUrl: (url) => defaultService.getNetworkInfo().then(i => i.qrDataUrl),
};
