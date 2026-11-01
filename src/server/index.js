const http = require('http');
const config = require('./config');
const { createInitialNotesIfEmpty } = require('./utils/seed');
const { getNetworkAddresses } = require('./utils/network');
const { printStartupBanner } = require('./utils/banner');
const VaultService = require('./services/vault.service');
const NetworkService = require('./services/network.service');
const WebSocketService = require('./services/websocket.service');
const WatcherService = require('./services/watcher.service');
const VaultController = require('./controllers/vault.controller');
const NetworkController = require('./controllers/network.controller');
const createApp = require('./app');

function startServer() {
  // Ensure seed notes if vault is empty
  createInitialNotesIfEmpty(config.vaultPath);

  // Initialize core services
  const vaultService = new VaultService(config.vaultPath);
  const networkService = new NetworkService(config.port, config.vaultPath, config.share);

  const server = http.createServer();
  const wsService = new WebSocketService(server, networkService);
  const watcherService = new WatcherService(config.vaultPath, wsService, vaultService);

  // Controllers
  const vaultController = new VaultController(vaultService, wsService);
  const networkController = new NetworkController(networkService, wsService);

  // Express application
  const app = createApp({
    vaultController,
    networkController,
    config,
    networkService,
  });

  server.on('request', app);

  server.listen(config.port, '0.0.0.0', () => {
    const { primaryIp } = getNetworkAddresses();
    printStartupBanner(config.port, primaryIp, networkService.isSharingEnabled);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n\x1b[90mAether shutting down gracefully...\x1b[0m');
    watcherService.close();
    wsService.close();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { server, wsService, watcherService, vaultService };
}

if (require.main === module) {
  startServer();
}

module.exports = startServer;
