export function calculateNoteStats(text = '') {
  const characters = text.length;
  const words = text.trim() ? (text.trim().match(/\S+/g) || []).length : 0;
  const bytes = new Blob([text]).size;

  let sizeKb = '0 KB';
  if (bytes > 0) {
    sizeKb = (bytes / 1024).toFixed(1) + ' KB';
  }

  return {
    words,
    characters,
    bytes,
    sizeKb,
  };
}
