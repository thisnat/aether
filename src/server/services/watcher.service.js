const path = require('path');
const chokidar = require('chokidar');

class WatcherService {
  constructor(vaultPath, wsService, vaultService = null) {
    this.vaultPath = vaultPath;
    this.wsService = wsService;
    this.vaultService = vaultService;
    this.debounceTimer = null;
    this.watcher = null;

    this.start();
  }

  start() {
    this.watcher = chokidar.watch(this.vaultPath, {
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    const scheduleBroadcast = (eventType, changedPath) => {
      if (this.vaultService) {
        this.vaultService.invalidateCache();
      }

      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        const rel = path.relative(this.vaultPath, changedPath).split(path.sep).join('/');
        this.wsService.broadcast({
          type: 'vault:external_change',
          action: eventType,
          path: rel,
        });
      }, 300);
    };

    this.watcher.on('add', (p) => scheduleBroadcast('add', p));
    this.watcher.on('change', (p) => scheduleBroadcast('change', p));
    this.watcher.on('unlink', (p) => scheduleBroadcast('unlink', p));
    this.watcher.on('addDir', (p) => scheduleBroadcast('addDir', p));
    this.watcher.on('unlinkDir', (p) => scheduleBroadcast('unlinkDir', p));
  }

  close() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}

module.exports = WatcherService;
