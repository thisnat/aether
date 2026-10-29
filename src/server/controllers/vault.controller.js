const path = require('path');

class VaultController {
  constructor(vaultService, wsService) {
    this.vault = vaultService;
    this.ws = wsService;
  }

  getTree = async (req, res) => {
    try {
      const tree = await this.vault.getTree();
      res.json({ tree, vaultPath: this.vault.vaultDir });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  getFile = async (req, res) => {
    try {
      const filePath = req.query.path;
      if (!filePath) return res.status(400).json({ error: 'Path is required' });
      const note = await this.vault.readFile(filePath);
      res.json(note);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  };

  saveFile = async (req, res) => {
    try {
      const { path: filePath, content, senderId } = req.body;
      if (!filePath) return res.status(400).json({ error: 'Path is required' });
      const saved = await this.vault.writeFile(filePath, content ?? '');

      this.ws.broadcast(
        {
          type: 'note:saved',
          path: saved.path,
          title: saved.title,
          content,
          mtime: saved.mtime,
          senderId,
        },
        senderId
      );

      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  deleteFile = async (req, res) => {
    try {
      const filePath = req.query.path;
      if (!filePath) return res.status(400).json({ error: 'Path is required' });
      const result = await this.vault.deleteItem(filePath);

      this.ws.broadcast({
        type: 'tree:changed',
        action: 'delete',
        path: filePath,
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  createDirectory = async (req, res) => {
    try {
      const { path: dirPath } = req.body;
      if (!dirPath) return res.status(400).json({ error: 'Path is required' });
      const result = await this.vault.createDirectory(dirPath);

      this.ws.broadcast({
        type: 'tree:changed',
        action: 'create_directory',
        path: dirPath,
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  deleteDirectory = async (req, res) => {
    try {
      const dirPath = req.query.path;
      if (!dirPath) return res.status(400).json({ error: 'Path is required' });
      const result = await this.vault.deleteItem(dirPath);

      this.ws.broadcast({
        type: 'tree:changed',
        action: 'delete_directory',
        path: dirPath,
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  renameItem = async (req, res) => {
    try {
      const { oldPath, newPath } = req.body;
      if (!oldPath || !newPath)
        return res.status(400).json({ error: 'Both oldPath and newPath are required' });
      const result = await this.vault.renameItem(oldPath, newPath);

      this.ws.broadcast({
        type: 'tree:changed',
        action: 'rename',
        oldPath: result.oldPath,
        newPath: result.newPath,
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  getGraph = async (req, res) => {
    try {
      const graph = await this.vault.getGraphData();
      res.json(graph);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  searchNotes = async (req, res) => {
    try {
      const query = req.query.q || '';
      const results = await this.vault.searchNotes(query);
      res.json({ query, results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  downloadRaw = (req, res) => {
    try {
      const filePath = req.query.path;
      if (!filePath) return res.status(400).send('Path is required');
      const { fullPath, relativePath } = this.vault.resolveSafe(filePath);
      res.download(fullPath, path.basename(relativePath));
    } catch (err) {
      res.status(404).send(err.message);
    }
  };
}

module.exports = VaultController;
