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
 * Compute deterministic SHA-256 hash of all source files with individual file hashes.
 * Normalizes relative paths with forward slashes for cross-platform consistency.
 */
function computeSourceManifest(files) {
  const fileHashMap = {};
  const overallHash = crypto.createHash('sha256');

  // Sort files deterministically by normalized relative path
  const sortedFiles = [...files].sort((a, b) => {
    const relA = path.relative(PROJECT_ROOT, a).replace(/\\/g, '/');
    const relB = path.relative(PROJECT_ROOT, b).replace(/\\/g, '/');
    return relA.localeCompare(relB);
  });

  for (const file of sortedFiles) {
    const relPath = path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file);
    const fileHash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);

    fileHashMap[relPath] = fileHash;
    overallHash.update(relPath);
    overallHash.update(content);
  }

  return {
    overallHash: overallHash.digest('hex'),
    fileHashMap,
  };
}

/**
 * Parse stored build metadata (supports JSON metadata and legacy raw hash strings).
 */
function readStoredMetadata() {
  if (!fs.existsSync(HASH_FILE)) return null;
  try {
    const content = fs.readFileSync(HASH_FILE, 'utf8').trim();
    if (content.startsWith('{')) {
      return JSON.parse(content);
    }
    // Legacy plain hash string
    return { hash: content, builtAt: null, files: null };
  } catch {
    return null;
  }
}

/**
 * Save build metadata to dist/.build-hash.
 */
function saveBuildMetadata(overallHash, fileHashMap) {
  try {
    if (!fs.existsSync(DIST_DIR)) return;
    const meta = {
      hash: overallHash,
      builtAt: new Date().toISOString(),
      fileCount: Object.keys(fileHashMap).length,
      files: fileHashMap,
    };
    fs.writeFileSync(HASH_FILE, JSON.stringify(meta, null, 2), 'utf8');
  } catch (err) {
    console.warn('[aether] Warning: Failed to save build metadata:', err.message);
  }
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
  const { overallHash, fileHashMap } = computeSourceManifest(sourceFiles);
  const storedMeta = readStoredMetadata();

  // If stored metadata exists, compare overall hash and detect exact changed files
  if (storedMeta) {
    if (storedMeta.hash === overallHash) {
      return {
        needed: false,
        overallHash,
        fileHashMap,
        builtAt: storedMeta.builtAt,
      };
    }

    // Detect changed files for helpful logging
    const changed = [];
    if (storedMeta.files) {
      for (const [file, hash] of Object.entries(fileHashMap)) {
        if (!storedMeta.files[file]) {
          changed.push(`Added: ${file}`);
        } else if (storedMeta.files[file] !== hash) {
          changed.push(`Modified: ${file}`);
        }
      }
      for (const file of Object.keys(storedMeta.files)) {
        if (!fileHashMap[file]) {
          changed.push(`Deleted: ${file}`);
        }
      }
    }

    const reason =
      changed.length > 0
        ? changed.slice(0, 2).join(', ') +
          (changed.length > 2 ? ` (+${changed.length - 2} more)` : '')
        : 'Source code or configuration has changed';

    return {
      needed: true,
      reason,
      overallHash,
      fileHashMap,
    };
  }

  // Fallback: If metadata file does not exist, compare source mtimes vs dist/index.html mtime
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
      overallHash,
      fileHashMap,
    };
  }

  // dist is newer than all sources; record metadata for future instant checks
  saveBuildMetadata(overallHash, fileHashMap);
  return { needed: false, overallHash, fileHashMap, builtAt: new Date(distMtime).toISOString() };
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
  const { overallHash, fileHashMap } = computeSourceManifest(sourceFiles);

  if (saveOnly) {
    saveBuildMetadata(overallHash, fileHashMap);
    return;
  }

  const status = checkBuildStatus();

  if (!status.needed) {
    const timeDetail = status.builtAt
      ? `built ${new Date(status.builtAt).toLocaleTimeString()}`
      : 'already built';
    console.log(
      `[aether] Client build is up to date (${timeDetail}). Reusing existing artifact in dist/.`
    );
    return;
  }

  console.log(`[aether] Client build needed (${status.reason}).`);
  buildClient();

  saveBuildMetadata(status.overallHash || overallHash, status.fileHashMap || fileHashMap);
  console.log('[aether] ✓ Build complete. Metadata recorded for fast startup.\n');
}

main();
