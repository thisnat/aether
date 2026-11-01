const express = require('express');

function createNetworkRouter(networkController) {
  const router = express.Router();

  router.get('/', networkController.getNetworkInfo);
  router.post('/sharing', networkController.setSharing);
  router.post('/toggle', networkController.setSharing);

  return router;
}

module.exports = createNetworkRouter;
