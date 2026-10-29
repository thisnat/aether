const express = require('express');

function createNetworkRouter(networkController) {
  const router = express.Router();

  router.get('/', networkController.getNetworkInfo);

  return router;
}

module.exports = createNetworkRouter;
