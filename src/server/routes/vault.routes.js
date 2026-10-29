const express = require('express');

function createVaultRouter(vaultController) {
  const router = express.Router();

  router.get('/tree', vaultController.getTree);
  router.get('/graph', vaultController.getGraph);
  router.get('/file', vaultController.getFile);
  router.post('/file', vaultController.saveFile);
  router.delete('/file', vaultController.deleteFile);

  router.post('/directory', vaultController.createDirectory);
  router.delete('/directory', vaultController.deleteDirectory);

  router.post('/rename', vaultController.renameItem);
  router.get('/search', vaultController.searchNotes);
  router.get('/raw', vaultController.downloadRaw);

  return router;
}

module.exports = createVaultRouter;
