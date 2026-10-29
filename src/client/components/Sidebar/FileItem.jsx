import React from 'react';
import { FileText, Download, Trash2 } from 'lucide-react';

export function FileItem({ item, isActive, onSelect, onDelete }) {
  const handleDownload = (e) => {
    e.stopPropagation();
    window.open(`/api/vault/raw?path=${encodeURIComponent(item.path)}`, '_blank');
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(item.path, false);
  };

  return (
    <div
      className={`tree-file ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(item.path)}
      title={item.path}
    >
      <div className="tree-item-title">
        <FileText size={14} />
        <span>{item.title || item.name.replace(/\.md$/, '')}</span>
      </div>

      <div className="tree-actions">
        <button
          type="button"
          className="tree-action-icon"
          onClick={handleDownload}
          title="Download note file"
        >
          <Download size={12} />
        </button>
        <button
          type="button"
          className="tree-action-icon danger"
          onClick={handleDelete}
          title="Delete note"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
