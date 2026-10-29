import React, { useMemo } from 'react';
import { calculateNoteStats } from '../../utils/formatters';

export function StatusBar({ saveStatus, content = '' }) {
  const stats = useMemo(() => {
    return calculateNoteStats(content);
  }, [content]);

  const statusLabel =
    {
      saving: 'Saving...',
      saved: 'Saved',
      dirty: 'Unsaved edits',
      loading: 'Loading note...',
      error: 'Save error!',
    }[saveStatus] || 'Saved';

  return (
    <footer className="statusbar">
      <div className="statusbar-left">
        <span className={`save-status ${saveStatus}`}>
          <span className="save-dot" />
          <span>{statusLabel}</span>
        </span>
        <span className="status-sep">/</span>
        <span>{stats.sizeKb}</span>
      </div>

      <div className="statusbar-right">
        <span>
          {stats.words} word{stats.words === 1 ? '' : 's'}
        </span>
        <span className="status-sep">/</span>
        <span>
          {stats.characters} character{stats.characters === 1 ? '' : 's'}
        </span>
      </div>
    </footer>
  );
}
