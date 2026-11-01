const express = require('express');
const path = require('path');
const fs = require('fs');
const createApiRouter = require('./routes');
const { isLoopbackAddress } = require('./utils/network');

function createApp({ vaultController, networkController, config, networkService }) {
  const app = express();

  app.use(express.json({ limit: '50mb' }));

  // Network sharing firewall middleware: block external requests when sharing is disabled
  app.use((req, res, next) => {
    if (networkService && networkService.isSharingEnabled) {
      return next();
    }

    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

    if (isLoopbackAddress(clientIp)) {
      return next();
    }

    if (req.accepts('html')) {
      return res.status(403).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aether - Sharing Disabled</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #0f1115;
      color: #e6edf3;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 32px 28px;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 8px 30px rgba(0,0,0,0.6);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      background: rgba(248, 81, 73, 0.15);
      color: #f85149;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      margin: 0 0 12px 0;
      font-weight: 600;
      color: #f0f6fc;
    }
    p {
      font-size: 14px;
      color: #8b949e;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    .hint {
      font-size: 12px;
      color: #6e7681;
      border-top: 1px solid #21262d;
      padding-top: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Network Sharing Off</div>
    <h1>Local Network Sharing is Disabled</h1>
    <p>Aether is currently running in local-only mode. To access your notes from this device, open Aether on your computer and enable <strong>Local Network Sharing</strong> from the top bar.</p>
    <div class="hint">Refresh this page once sharing is enabled on the host.</div>
  </div>
</body>
</html>`);
    }

    return res.status(403).json({
      error:
        'Local network sharing is disabled on this Aether host. Please enable it in the app on the host machine to connect.',
      sharingEnabled: false,
    });
  });

  // Vendor static files for offline operation
  const nodeModulesDir = path.resolve(process.cwd(), 'node_modules');
  app.use('/vendor/marked.min.js', (req, res) => {
    res.sendFile(path.join(nodeModulesDir, 'marked/lib/marked.umd.js'));
  });
  app.use('/vendor/highlight.min.js', (req, res) => {
    res.sendFile(path.join(nodeModulesDir, '@highlightjs/cdn-assets/highlight.min.js'));
  });
  app.use('/vendor/highlight-dark.css', (req, res) => {
    res.sendFile(path.join(nodeModulesDir, '@highlightjs/cdn-assets/styles/github-dark.min.css'));
  });
  app.use('/vendor/highlight-light.css', (req, res) => {
    res.sendFile(path.join(nodeModulesDir, '@highlightjs/cdn-assets/styles/github.min.css'));
  });

  // Mount API endpoints
  app.use('/api', createApiRouter({ vaultController, networkController }));

  // Determine client static directory: prefer built React frontend ('dist'), fallback to 'public'
  const staticDir =
    fs.existsSync(config.distDir) && fs.existsSync(path.join(config.distDir, 'index.html'))
      ? config.distDir
      : config.publicDir;

  app.use(express.static(staticDir));

  // SPA fallback
  app.use((req, res) => {
    const indexPath = path.join(staticDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Not Found');
    }
  });

  return app;
}

module.exports = createApp;
