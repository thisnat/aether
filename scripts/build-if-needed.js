#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const DIST_INDEX = path.join(DIST_DIR, 'index.html');
const DIST_ASSETS = path.join(DIST_DIR, 'assets');
const HASH_FILE = path.join(DIST_DIR, '.build-hash');

/**
 * Recursively find all files in a directory, ignoring hidden/temp files.
 */
function getFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Collect all relevant client source files and configuration.
 */
function getSourceFiles() {
  const clientFiles = getFilesRecursively(path.join(PROJECT_ROOT, 'src/client'));
  const publicFiles = getFilesRecursively(path.join(PROJECT_ROOT, 'public'));
  const configFiles = [
    path.join(PROJECT_ROOT, 'vite.config.mjs'),
    path.join(PROJECT_ROOT, 'package.json'),
  ].filter((f) => fs.existsSync(f));

  return [...clientFiles, ...publicFiles, ...configFiles];
}

/**
 * Compute deterministic SHA-256 hash of all source files.
 * Normalizes relative paths with forward slashes for cross-platform consistency.
 */
function computeSourceHash(files) {
  const hash = crypto.createHash('sha256');

  // Sort files deterministically by normalized relative path
  const sortedFiles = [...files].sort((a, b) => {
    const relA = path.relative(PROJECT_ROOT, a).replace(/\\/g, '/');
    const relB = path.relative(PROJECT_ROOT, b).replace(/\\/g, '/');
    return relA.localeCompare(relB);
  });

  for (const file of sortedFiles) {
    const relPath = path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
    hash.update(relPath);
    hash.update(fs.readFileSync(file));
  }

  return hash.digest('hex');
}

/**
 * Check if dist is present, valid, and up-to-date with source code.
 */
function checkBuildStatus() {
  const force = process.argv.includes('--force') || process.env.FORCE_BUILD === '1';
  if (force) {
    return { needed: true, reason: 'Force rebuild requested' };
  }

  if (!fs.existsSync(DIST_DIR)) {
    return { needed: true, reason: 'dist directory does not exist' };
  }

  if (!fs.existsSync(DIST_INDEX) || fs.statSync(DIST_INDEX).size === 0) {
    return { needed: true, reason: 'dist/index.html is missing or empty' };
  }

  if (!fs.existsSync(DIST_ASSETS) || fs.readdirSync(DIST_ASSETS).length === 0) {
    return { needed: true, reason: 'dist/assets directory is missing or empty' };
  }

  const sourceFiles = getSourceFiles();
  const currentHash = computeSourceHash(sourceFiles);

  // If stored hash exists, compare with current source hash
  if (fs.existsSync(HASH_FILE)) {
    try {
      const storedHash = fs.readFileSync(HASH_FILE, 'utf8').trim();
      if (storedHash === currentHash) {
        return { needed: false, hash: currentHash };
      }
      return {
        needed: true,
        reason: 'Source code or configuration has changed',
        hash: currentHash,
      };
    } catch {
      return { needed: true, reason: 'Could not read build hash', hash: currentHash };
    }
  }

  // Fallback: If hash file does not exist, compare source mtime vs dist/index.html mtime
  const distMtime = fs.statSync(DIST_INDEX).mtimeMs;
  let newestSource = null;
  let newestMtime = 0;

  for (const file of sourceFiles) {
    const mtime = fs.statSync(file).mtimeMs;
    if (mtime > newestMtime) {
      newestMtime = mtime;
      newestSource = file;
    }
  }

  if (newestMtime > distMtime) {
    const rel = path.relative(PROJECT_ROOT, newestSource);
    return {
      needed: true,
      reason: `Source file ${rel} is newer than dist artifact`,
      hash: currentHash,
    };
  }

  // dist is newer than all sources; write the hash for future instant checks
  try {
    fs.writeFileSync(HASH_FILE, currentHash, 'utf8');
  } catch {}

  return { needed: false, hash: currentHash };
}

/**
 * Execute Vite build command.
 */
function buildClient() {
  console.log('[aether] Building client bundle (vite build)...');

  const isWindows = process.platform === 'win32';
  const localVite = path.join(
    PROJECT_ROOT,
    'node_modules',
    '.bin',
    isWindows ? 'vite.cmd' : 'vite'
  );

  let result;
  if (fs.existsSync(localVite)) {
    result = spawnSync(localVite, ['build'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: isWindows,
    });
  } else {
    const npxCmd = isWindows ? 'npx.cmd' : 'npx';
    result = spawnSync(npxCmd, ['vite', 'build'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: isWindows,
    });
  }

  if (result.status !== 0) {
    console.error('\n✖ Client build failed with exit code ' + (result.status || 1));
    process.exit(result.status || 1);
  }
}

/**
 * Main routine
 */
function main() {
  const saveOnly = process.argv.includes('--save-only');
  const sourceFiles = getSourceFiles();
  const currentHash = computeSourceHash(sourceFiles);

  if (saveOnly) {
    if (fs.existsSync(DIST_DIR)) {
      fs.writeFileSync(HASH_FILE, currentHash, 'utf8');
    }
    return;
  }

  const status = checkBuildStatus();

  if (!status.needed) {
    console.log('[aether] Client build is up to date. Reusing existing artifact in dist/.');
    return;
  }

  console.log(`[aether] Client build needed (${status.reason}).`);
  buildClient();

  // Save the hash of the built sources
  try {
    fs.writeFileSync(HASH_FILE, currentHash, 'utf8');
    console.log('[aether] ✓ Build complete. Hash recorded for fast startup.\n');
  } catch (err) {
    console.warn('[aether] Warning: Failed to save build hash:', err.message);
  }
}

main();
