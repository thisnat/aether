import React from 'react';
import { FolderItem } from './FolderItem';
import { FileItem } from './FileItem';

export function FileTree({ nodes, activePath, onSelectNote, onNewNote, onDeleteItem }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="tree-empty">
        Vault is empty.
        <br />
        Click "+ Note" to create one.
      </div>
    );
  }

  return (
    <>
      {nodes.map((node) => {
        if (node.type === 'folder') {
          return (
            <FolderItem
              key={node.path}
              item={node}
              activePath={activePath}
              onSelectNote={onSelectNote}
              onNewNote={onNewNote}
              onDeleteItem={onDeleteItem}
            />
          );
        }

        return (
          <FileItem
            key={node.path}
            item={node}
            isActive={activePath === node.path}
            onSelect={onSelectNote}
            onDelete={onDeleteItem}
          />
        );
      })}
    </>
  );
}
