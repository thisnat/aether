import { useEffect } from 'react';

export function useKeyboardShortcuts({
  onSave,
  onSearch,
  onNewNote,
  onToggleMode,
  onToggleSidebar,
  onCloseModals,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCmd = e.ctrlKey || e.metaKey;

      if (isCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }

      if (isCmd && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        onSearch?.();
        return;
      }

      if (isCmd && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNewNote?.();
        return;
      }

      if (isCmd && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        onToggleMode?.();
        return;
      }

      if (isCmd && e.key === '\\') {
        e.preventDefault();
        onToggleSidebar?.();
        return;
      }

      if (e.key === 'Escape') {
        onCloseModals?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onSearch, onNewNote, onToggleMode, onToggleSidebar, onCloseModals]);
}
