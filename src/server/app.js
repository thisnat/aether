const express = require('express');
const path = require('path');
const fs = require('fs');
const createApiRouter = require('./routes');

function createApp({ vaultController, networkController, config }) {
  const app = express();

  app.use(express.json({ limit: '50mb' }));

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
