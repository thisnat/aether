import React, { useState } from 'react';
import { ChevronRight, Folder, Plus, Trash2 } from 'lucide-react';
import { FileTree } from './FileTree';

export function FolderItem({ item, activePath, onSelectNote, onNewNote, onDeleteItem }) {
  const [isOpen, setIsOpen] = useState(true);

  const handleToggle = (e) => {
    if (e.target.closest('.tree-actions')) return;
    setIsOpen(!isOpen);
  };

  const handleNewNote = (e) => {
    e.stopPropagation();
    onNewNote(item.path);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDeleteItem(item.path, true);
  };

  return (
    <div className={`tree-folder ${isOpen ? 'open' : ''}`}>
      <div className="tree-folder-header" onClick={handleToggle}>
        <div className="tree-item-title">
          <span className="folder-arrow">
            <ChevronRight size={12} />
          </span>
          <Folder size={14} />
          <span>{item.name}</span>
        </div>

        <div className="tree-actions">
          <button
            type="button"
            className="tree-action-icon"
            onClick={handleNewNote}
            title="New Note in this folder"
          >
            <Plus size={12} />
          </button>
          <button
            type="button"
            className="tree-action-icon danger"
            onClick={handleDelete}
            title="Delete folder"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="tree-folder-children">
        <FileTree
          nodes={item.children || []}
          activePath={activePath}
          onSelectNote={onSelectNote}
          onNewNote={onNewNote}
          onDeleteItem={onDeleteItem}
        />
      </div>
    </div>
  );
}
