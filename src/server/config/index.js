const path = require('path');

function loadConfig() {
  const args = process.argv.slice(2);
  let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  let vaultPath = process.env.VAULT_DIR || path.resolve(process.cwd(), 'vault');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--vault' && args[i + 1]) {
      vaultPath = path.resolve(args[i + 1]);
      i++;
    }
  }

  // Path where built frontend assets live
  const distDir = path.resolve(process.cwd(), 'dist');
  // Fallback public folder if dist not built yet
  const publicDir = path.resolve(process.cwd(), 'public');

  return {
    port,
    vaultPath,
    distDir,
    publicDir,
    isDev: process.env.NODE_ENV !== 'production',
  };
}

module.exports = loadConfig();
