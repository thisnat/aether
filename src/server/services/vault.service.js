const fs = require('fs');
const path = require('path');

class VaultService {
  constructor(vaultDir) {
    this.vaultDir = path.resolve(vaultDir);
    if (!fs.existsSync(this.vaultDir)) {
      fs.mkdirSync(this.vaultDir, { recursive: true });
    }
  }

  /**
   * Safely resolves a relative path within the vault.
   * Throws an error if path traverses outside the vault directory.
   */
  resolveSafe(relativePath = '') {
    const cleanRel = path.normalize(relativePath).replace(/^([/\\])+/, '');
    const fullPath = path.resolve(this.vaultDir, cleanRel);

    if (fullPath !== this.vaultDir && !fullPath.startsWith(this.vaultDir + path.sep)) {
      throw new Error('Access denied: Path is outside the vault directory');
    }

    return {
      fullPath,
      relativePath: path.relative(this.vaultDir, fullPath).split(path.sep).join('/'),
    };
  }

  /**
   * Recursively reads vault contents as a structured tree.
   */
  async getTree(dirRel = '') {
    const { fullPath } = this.resolveSafe(dirRel);

    if (!fs.existsSync(fullPath)) {
      return [];
    }

    const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
    const tree = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const entryRel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
      const entryFull = path.join(fullPath, entry.name);

      if (entry.isDirectory()) {
        const children = await this.getTree(entryRel);
        tree.push({
          type: 'folder',
          name: entry.name,
          path: entryRel,
          children,
        });
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const stats = await fs.promises.stat(entryFull);
        tree.push({
          type: 'file',
          name: entry.name,
          title: entry.name.replace(/\.md$/i, ''),
          path: entryRel,
          size: stats.size,
          mtime: stats.mtime,
        });
      }
    }

    tree.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    return tree;
  }

  /**
   * Reads a markdown note.
   */
  async readFile(relativePath) {
    let cleanRel = relativePath.trim();
    if (!cleanRel.toLowerCase().endsWith('.md')) {
      cleanRel += '.md';
    }

    const { fullPath, relativePath: safeRel } = this.resolveSafe(cleanRel);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Note not found: ${safeRel}`);
    }

    const stats = await fs.promises.stat(fullPath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${safeRel}`);
    }

    const content = await fs.promises.readFile(fullPath, 'utf-8');
    const noteName = path.basename(safeRel, '.md');
    const backlinks = await this.findBacklinks(noteName, safeRel);

    return {
      path: safeRel,
      name: path.basename(safeRel),
      title: noteName,
      content,
      size: stats.size,
      mtime: stats.mtime,
      backlinks,
    };
  }

  /**
   * Writes or updates a markdown note.
   */
  async writeFile(relativePath, content = '') {
    let cleanRel = relativePath.trim();
    if (!cleanRel.toLowerCase().endsWith('.md')) {
      cleanRel += '.md';
    }

    const { fullPath, relativePath: safeRel } = this.resolveSafe(cleanRel);
    const parentDir = path.dirname(fullPath);

    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true });
    }

    await fs.promises.writeFile(fullPath, content, 'utf-8');
    const stats = await fs.promises.stat(fullPath);

    return {
      path: safeRel,
      name: path.basename(safeRel),
      title: path.basename(safeRel, '.md'),
      size: stats.size,
      mtime: stats.mtime,
    };
  }

  /**
   * Creates a folder.
   */
  async createDirectory(relativePath) {
    const { fullPath, relativePath: safeRel } = this.resolveSafe(relativePath);
    await fs.promises.mkdir(fullPath, { recursive: true });
    return { path: safeRel };
  }

  /**
   * Deletes a file or directory.
   */
  async deleteItem(relativePath) {
    const { fullPath, relativePath: safeRel } = this.resolveSafe(relativePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Item not found: ${safeRel}`);
    }

    const stats = await fs.promises.stat(fullPath);
    if (stats.isDirectory()) {
      await fs.promises.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.promises.unlink(fullPath);
    }

    return { deleted: safeRel };
  }

  /**
   * Renames/moves a file or folder.
   */
  async renameItem(oldRelativePath, newRelativePath) {
    let cleanOld = oldRelativePath.trim();
    let cleanNew = newRelativePath.trim();

    const oldResolved = this.resolveSafe(cleanOld);
    if (!fs.existsSync(oldResolved.fullPath)) {
      throw new Error(`Source not found: ${oldResolved.relativePath}`);
    }

    const isFile = (await fs.promises.stat(oldResolved.fullPath)).isFile();
    if (isFile && !cleanNew.toLowerCase().endsWith('.md')) {
      cleanNew += '.md';
    }

    const newResolved = this.resolveSafe(cleanNew);

    if (fs.existsSync(newResolved.fullPath)) {
      throw new Error(`Destination already exists: ${newResolved.relativePath}`);
    }

    const newParent = path.dirname(newResolved.fullPath);
    if (!fs.existsSync(newParent)) {
      await fs.promises.mkdir(newParent, { recursive: true });
    }

    await fs.promises.rename(oldResolved.fullPath, newResolved.fullPath);

    return {
      oldPath: oldResolved.relativePath,
      newPath: newResolved.relativePath,
    };
  }

  /**
   * Search notes for query string.
   */
  async searchNotes(query) {
    if (!query || !query.trim()) return [];

    const cleanQuery = query.trim().toLowerCase();
    const results = [];

    const scan = async (dirRel = '') => {
      const { fullPath } = this.resolveSafe(dirRel);
      if (!fs.existsSync(fullPath)) return;

      const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const entryRel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
        const entryFull = path.join(fullPath, entry.name);

        if (entry.isDirectory()) {
          await scan(entryRel);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const content = await fs.promises.readFile(entryFull, 'utf-8');
          const lines = content.split('\n');
          const title = entry.name.replace(/\.md$/i, '');
          const matches = [];

          const titleMatches = title.toLowerCase().includes(cleanQuery);

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.toLowerCase().includes(cleanQuery)) {
              matches.push({
                lineNumber: i + 1,
                line: line.trim(),
              });
              if (matches.length >= 5) break;
            }
          }

          if (titleMatches || matches.length > 0) {
            results.push({
              path: entryRel,
              title,
              titleMatch: titleMatches,
              matches,
              matchCount: matches.length + (titleMatches ? 1 : 0),
            });
          }
        }
      }
    };

    await scan();
    results.sort((a, b) => b.matchCount - a.matchCount);
    return results;
  }

  /**
   * Finds notes that link to target note via [[NoteName]] or [[folder/NoteName]].
   */
  async findBacklinks(targetNoteName, currentNoteRel = '') {
    const backlinks = [];
    const targetBase = path.basename(targetNoteName, '.md').toLowerCase();

    const scan = async (dirRel = '') => {
      const { fullPath } = this.resolveSafe(dirRel);
      if (!fs.existsSync(fullPath)) return;

      const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const entryRel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
        if (entryRel === currentNoteRel) continue;

        const entryFull = path.join(fullPath, entry.name);
        if (entry.isDirectory()) {
          await scan(entryRel);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const content = await fs.promises.readFile(entryFull, 'utf-8');
          const regex = new RegExp(`\\[\\[(?:[^\\]|]+\\/)?${escapeRegExp(targetBase)}(?:\\|[^\\]]+)?\\]\\]`, 'i');
          if (regex.test(content)) {
            backlinks.push({
              path: entryRel,
              title: entry.name.replace(/\.md$/i, ''),
            });
          }
        }
      }
    };

    try {
      await scan();
    } catch {
      // Ignore scan errors
    }

    return backlinks;
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = VaultService;
