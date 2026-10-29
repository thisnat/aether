import React from 'react';
import { Search, FilePlus, FolderPlus, RotateCw, QrCode, X } from 'lucide-react';
import { FileTree } from './FileTree';

export function Sidebar({
  tree,
  activePath,
  collapsed,
  mobileOpen,
  primaryIp,
  onCloseMobile,
  onSelectNote,
  onNewNote,
  onNewFolder,
  onRefreshTree,
  onOpenSearch,
  onOpenNetworkModal,
  onDeleteItem,
}) {
  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Mobile Sidebar Top Row */}
        <div className="sidebar-mobile-nav">
          <div className="brand">
            <span className="brand-glyph">▲</span>
            <span className="brand-title">Aether</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onCloseMobile}
            title="Close Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sidebar Search & Quick Actions */}
        <div className="sidebar-header">
          <div className="search-trigger" onClick={onOpenSearch} title="Search notes (Ctrl+K)">
            <Search size={14} />
            <span>Quick search...</span>
            <kbd>Ctrl K</kbd>
          </div>

          <div className="sidebar-action-row">
            <button
              type="button"
              className="sidebar-tool-btn"
              onClick={() => onNewNote('')}
              title="New Note in root (Ctrl+N)"
            >
              <FilePlus size={14} />
              <span>Note</span>
            </button>

            <button
              type="button"
              className="sidebar-tool-btn"
              onClick={() => onNewFolder('')}
              title="New Folder"
            >
              <FolderPlus size={14} />
              <span>Folder</span>
            </button>

            <button
              type="button"
              className="sidebar-tool-btn"
              onClick={onRefreshTree}
              title="Refresh files"
            >
              <RotateCw size={14} />
            </button>
          </div>
        </div>

        {/* File Tree List */}
        <div className="sidebar-content">
          <FileTree
            nodes={tree}
            activePath={activePath}
            onSelectNote={onSelectNote}
            onNewNote={onNewNote}
            onDeleteItem={onDeleteItem}
          />
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-info" onClick={onOpenNetworkModal}>
            <span className="status-dot" />
            <span>{primaryIp || 'Local Network Active'}</span>
          </div>
          <button
            type="button"
            className="footer-icon-btn"
            onClick={onOpenNetworkModal}
            title="Show network QR code"
          >
            <QrCode size={14} />
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'active' : ''}`}
        onClick={onCloseMobile}
      />
    </>
  );
}
