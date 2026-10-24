const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { WebSocketServer } = require('ws');
const chokidar = require('chokidar');

const Vault = require('./lib/vault');
const { getNetworkAddresses, generateQrDataUrl, printStartupBanner } = require('./lib/network');

// Command line argument parser or defaults
const args = process.argv.slice(2);
let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
let vaultPath = process.env.VAULT_DIR || path.join(__dirname, 'vault');

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--vault' && args[i + 1]) {
    vaultPath = path.resolve(args[i + 1]);
    i++;
  }
}

// Initialize Vault
const vault = new Vault(vaultPath);

// Create sample welcome notes if vault is empty
createInitialNotesIfEmpty(vaultPath);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json({ limit: '50mb' }));

// Vendor static files (fully offline local network operation)
app.use('/vendor/marked.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/marked/lib/marked.umd.js'));
});
app.use('/vendor/highlight.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/@highlightjs/cdn-assets/highlight.min.js'));
});
app.use('/vendor/highlight-dark.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/@highlightjs/cdn-assets/styles/github-dark.min.css'));
});
app.use('/vendor/highlight-light.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/@highlightjs/cdn-assets/styles/github.min.css'));
});

// Serve frontend public directory
app.use(express.static(path.join(__dirname, 'public')));

// Cache network info
let cachedNetworkInfo = null;

async function getNetworkInfo() {
  if (cachedNetworkInfo) return cachedNetworkInfo;
  const { primaryIp, allIps } = getNetworkAddresses();
  const localUrl = `http://localhost:${port}`;
  const networkUrl = `http://${primaryIp}:${port}`;
  const qrDataUrl = await generateQrDataUrl(networkUrl);

  cachedNetworkInfo = {
    port,
    primaryIp,
    allIps,
    localUrl,
    networkUrl,
    qrDataUrl,
    vaultPath,
  };
  return cachedNetworkInfo;
}

// REST API routes
app.get('/api/network', async (req, res) => {
  try {
    const info = await getNetworkInfo();
    res.json({
      ...info,
      peerCount: wss.clients.size,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vault/tree', async (req, res) => {
  try {
    const tree = await vault.getTree();
    res.json({ tree, vaultPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vault/file', async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });
    const note = await vault.readFile(filePath);
    res.json(note);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/vault/file', async (req, res) => {
  try {
    const { path: filePath, content, senderId } = req.body;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });
    const saved = await vault.writeFile(filePath, content ?? '');

    // Notify connected WebSocket clients of the update
    broadcast({
      type: 'note:saved',
      path: saved.path,
      title: saved.title,
      content,
      mtime: saved.mtime,
      senderId,
    }, senderId);

    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vault/file', async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });
    const result = await vault.deleteItem(filePath);

    broadcast({
      type: 'tree:changed',
      action: 'delete',
      path: filePath,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vault/directory', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    if (!dirPath) return res.status(400).json({ error: 'Path is required' });
    const result = await vault.createDirectory(dirPath);

    broadcast({
      type: 'tree:changed',
      action: 'create_directory',
      path: dirPath,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vault/directory', async (req, res) => {
  try {
    const dirPath = req.query.path;
    if (!dirPath) return res.status(400).json({ error: 'Path is required' });
    const result = await vault.deleteItem(dirPath);

    broadcast({
      type: 'tree:changed',
      action: 'delete_directory',
      path: dirPath,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vault/rename', async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: 'Both oldPath and newPath are required' });
    const result = await vault.renameItem(oldPath, newPath);

    broadcast({
      type: 'tree:changed',
      action: 'rename',
      oldPath: result.oldPath,
      newPath: result.newPath,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vault/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const results = await vault.searchNotes(query);
    res.json({ query, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Raw file download
app.get('/api/vault/raw', (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).send('Path is required');
    const { fullPath, relativePath } = vault.resolveSafe(filePath);
    res.download(fullPath, path.basename(relativePath));
  } catch (err) {
    res.status(404).send(err.message);
  }
});

// Fallback to index.html for SPA client navigation
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket Handling
function broadcast(data, excludeSenderId = null) {
  const payload = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) { // OPEN
      if (excludeSenderId && client.clientId === excludeSenderId) {
        continue;
      }
      client.send(payload);
    }
  }
}

function broadcastPeerCount() {
  broadcast({
    type: 'peer:count',
    count: wss.clients.size,
  });
}

wss.on('connection', (ws) => {
  ws.clientId = 'peer_' + Math.random().toString(36).substring(2, 9);

  // Send initial welcome & peer count
  ws.send(JSON.stringify({
    type: 'connected',
    clientId: ws.clientId,
    peerCount: wss.clients.size,
  }));

  broadcastPeerCount();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      // Relay collaborative typing or cursor if implemented
      if (data.type === 'note:typing') {
        broadcast({
          type: 'note:typing',
          path: data.path,
          user: data.user || 'Peer',
          senderId: ws.clientId,
        }, ws.clientId);
      }
    } catch {
      // Ignore invalid JSON
    }
  });

  ws.on('close', () => {
    broadcastPeerCount();
  });
});

// Watch Vault with Chokidar for external edits (Obsidian, VS Code, etc.)
let watcherDebounce = null;
const watcher = chokidar.watch(vaultPath, {
  ignored: /(^|[/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true,
});

function scheduleWatcherBroadcast(eventType, changedPath) {
  clearTimeout(watcherDebounce);
  watcherDebounce = setTimeout(() => {
    const rel = path.relative(vaultPath, changedPath).split(path.sep).join('/');
    broadcast({
      type: 'vault:external_change',
      action: eventType,
      path: rel,
    });
  }, 300);
}

watcher.on('add', (p) => scheduleWatcherBroadcast('add', p));
watcher.on('change', (p) => scheduleWatcherBroadcast('change', p));
watcher.on('unlink', (p) => scheduleWatcherBroadcast('unlink', p));
watcher.on('addDir', (p) => scheduleWatcherBroadcast('addDir', p));
watcher.on('unlinkDir', (p) => scheduleWatcherBroadcast('unlinkDir', p));

// Helper: Seed initial notes if vault is empty
function createInitialNotesIfEmpty(dir) {
  const existing = fs.readdirSync(dir).filter(f => !f.startsWith('.'));
  if (existing.length > 0) return;

  const welcomeNote = `# ✧ Welcome to Aether

**Aether** is a minimal, local-network markdown note-taking app designed for simplicity, privacy, and seamless sharing across all your devices.

---

### 🌐 Real-Time Local Network Sharing
- **Zero Configuration**: Aether automatically binds to your local Wi-Fi or Ethernet.
- **Cross-Device Ready**: Open the network URL or scan the QR code on your phone, tablet, or another computer on the same network.
- **No Cloud Required**: Your notes stay 100% on this local machine. No accounts, no subscriptions, no third-party servers.

### 📝 Obsidian & Plain Markdown Compatible
- All notes are saved directly as standard \`.md\` files in your \`./vault\` folder.
- You can open this vault directly in **Obsidian**, **VS Code**, or any text editor — any changes made externally are instantly synchronized in real time!
- Full support for:
  - **Internal Wikilinks**: Link other notes with \`[[Quick Start]]\` or \`[[Guides/Formatting Demo]]\`.
  - **Interactive Checklists**: Click checkboxes right in the preview to update your notes!
  - **Code Highlighting**: Multi-language syntax highlighting with one-click copy.
  - **Search & Quick Switcher**: Jump anywhere with \`Ctrl + K\` (or \`Ctrl + P\`).

### ⌨️ Handy Keyboard Shortcuts
| Shortcut | Action |
| :--- | :--- |
| **Ctrl + S** | Save note immediately *(auto-save is also active)* |
| **Ctrl + K** / **Ctrl + P** | Quick switcher / Search notes |
| **Ctrl + N** | Create new note |
| **Ctrl + E** | Toggle Edit / Preview mode |
| **Ctrl + \\** | Toggle sidebar visibility |

---

*Try clicking on [[Quick Start]] to see how internal wikilinks work, or scan the QR code in the top bar with your phone!*
`;

  const quickStartNote = `# ⚡ Quick Start Guide

Welcome to your second note in Aether!

### 1. Connecting your Phone or Tablet
1. Make sure your phone is connected to the same Wi-Fi network as this computer.
2. Click the **"Share on Network"** button in the top navigation bar (or look at the terminal where you ran \`npm start\`).
3. Point your camera at the QR code, or type the network URL in your phone's browser.
4. You can now read, search, and edit your notes from your mobile device!

### 2. Organizing with Folders
- Click the **"New Folder"** icon in the left sidebar to group notes into categories (e.g. *Journal*, *Projects*, *Work*).
- Drag-and-drop or use the rename option to organize your notes.

### 3. Checklists & Tasks
Here are some things to try:
- [x] Started Aether server
- [ ] Connect a phone or second device via the Network QR code
- [ ] Try creating your first note with **Ctrl + N**
- [ ] Check out [[Guides/Formatting Demo]] for tables, code blocks, and markdown styles

*Click any checkbox above in the preview window to see it update the raw markdown file instantly!*
`;

  const demoDir = path.join(dir, 'Guides');
  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
  }

  const formattingDemo = `# 🎨 Formatting Demo

Here is a quick overview of how Aether renders rich Markdown.

## Wikilinks & Internal Navigation
You can link to any note in your vault using double brackets:
- Back to home: [[Welcome to Aether]]
- Quick setup: [[Quick Start]]

If you click a wikilink to a note that doesn't exist yet, Aether will offer to create it for you on the spot!

---

## Code Syntax Highlighting

\`\`\`javascript
// Aether network sync snippet
const { getNetworkAddresses } = require('./lib/network');

const { primaryIp } = getNetworkAddresses();
console.log(\`Aether live on http://\${primaryIp}:3000\`);
\`\`\`

\`\`\`python
# Python list comprehension example
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fibonacci(8)))
\`\`\`

---

## Quotes & Blockquotes

> "Simplicity is the prerequisite for reliability."
> — *Edsger W. Dijkstra*

---

## Tables

| Feature | Aether | Cloud Notes |
| :--- | :---: | :---: |
| **Local-first (plain .md)** | ✅ Yes | ❌ Proprietary |
| **Local Wi-Fi Sharing** | ✅ Instant | ❌ Needs Internet |
| **Obsidian Compatible** | ✅ 100% | ❌ No |
| **Zero Account Required** | ✅ Yes | ❌ Requires login |
| **Clean & Minimal UI** | ✅ Built-in | ⚠️ Varies |
`;

  fs.writeFileSync(path.join(dir, 'Welcome to Aether.md'), welcomeNote, 'utf-8');
  fs.writeFileSync(path.join(dir, 'Quick Start.md'), quickStartNote, 'utf-8');
  fs.writeFileSync(path.join(demoDir, 'Formatting Demo.md'), formattingDemo, 'utf-8');
}

// Start Server listening on 0.0.0.0
server.listen(port, '0.0.0.0', async () => {
  const { primaryIp } = getNetworkAddresses();
  printStartupBanner(port, primaryIp);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\x1b[90mAether shutting down gracefully...\x1b[0m');
  watcher.close();
  server.close(() => {
    process.exit(0);
  });
});
