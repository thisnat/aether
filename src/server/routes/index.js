const express = require('express');
const createVaultRouter = require('./vault.routes');
const createNetworkRouter = require('./network.routes');

function createApiRouter({ vaultController, networkController }) {
  const router = express.Router();

  router.use('/vault', createVaultRouter(vaultController));
  router.use('/network', createNetworkRouter(networkController));

  return router;
}

module.exports = createApiRouter;
