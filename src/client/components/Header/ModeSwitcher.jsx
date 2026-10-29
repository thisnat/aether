import React from 'react';
import { Edit3, Columns, Eye } from 'lucide-react';

export function ModeSwitcher({ mode, onSelectMode }) {
  return (
    <div className="mode-switcher">
      <button
        type="button"
        className={`mode-btn ${mode === 'edit' ? 'active' : ''}`}
        onClick={() => onSelectMode('edit')}
        title="Edit markdown"
      >
        <Edit3 size={14} />
        <span>Edit</span>
      </button>

      <button
        type="button"
        className={`mode-btn ${mode === 'split' ? 'active' : ''}`}
        onClick={() => onSelectMode('split')}
        title="Split view (Side by side)"
      >
        <Columns size={14} />
        <span>Split</span>
      </button>

      <button
        type="button"
        className={`mode-btn ${mode === 'preview' ? 'active' : ''}`}
        onClick={() => onSelectMode('preview')}
        title="Reading preview"
      >
        <Eye size={14} />
        <span>Preview</span>
      </button>
    </div>
  );
}
