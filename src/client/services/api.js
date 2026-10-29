/**
 * REST API client for Aether Vault & Network
 */

export async function fetchNetworkInfo() {
  const res = await fetch('/api/network');
  if (!res.ok) throw new Error('Failed to fetch network info');
  return res.json();
}

export async function fetchVaultTree() {
  const res = await fetch('/api/vault/tree');
  if (!res.ok) throw new Error('Failed to fetch vault tree');
  return res.json();
}

export async function fetchNote(filePath) {
  const res = await fetch(`/api/vault/file?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) throw new Error('Failed to load note');
  return res.json();
}

export async function saveNote(filePath, content, senderId) {
  const res = await fetch('/api/vault/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: filePath,
      content,
      senderId,
    }),
  });
  if (!res.ok) throw new Error('Failed to save note');
  return res.json();
}

export async function deleteNote(filePath) {
  const res = await fetch(`/api/vault/file?path=${encodeURIComponent(filePath)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete note');
  return res.json();
}

export async function createDirectory(dirPath) {
  const res = await fetch('/api/vault/directory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: dirPath }),
  });
  if (!res.ok) throw new Error('Failed to create directory');
  return res.json();
}

export async function deleteDirectory(dirPath) {
  const res = await fetch(`/api/vault/directory?path=${encodeURIComponent(dirPath)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete directory');
  return res.json();
}

export async function renameItem(oldPath, newPath) {
  const res = await fetch('/api/vault/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPath, newPath }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to rename item');
  }
  return res.json();
}

export async function searchNotes(query) {
  const res = await fetch(`/api/vault/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to execute search');
  return res.json();
}
