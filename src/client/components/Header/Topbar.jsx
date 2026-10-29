import React from 'react';
import { PanelLeft, Share2, Sun, Moon } from 'lucide-react';
import { ModeSwitcher } from './ModeSwitcher';

export function Topbar({
  activeNotePath,
  mode,
  onSelectMode,
  peerCount,
  theme,
  onToggleTheme,
  onToggleSidebar,
  onOpenNetworkModal,
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleSidebar}
          title="Toggle Sidebar (Ctrl+\)"
        >
          <PanelLeft size={18} />
        </button>

        <div className="brand">
          <span className="brand-glyph">▲</span>
          <span className="brand-title">Aether</span>
        </div>

        <div className="active-note-path">
          {activeNotePath ? (
            <span>{activeNotePath}</span>
          ) : (
            <span className="muted">No note selected</span>
          )}
        </div>
      </div>

      <div className="topbar-center">
        <ModeSwitcher mode={mode} onSelectMode={onSelectMode} />
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className="peer-badge"
          onClick={onOpenNetworkModal}
          title="Local network sharing info"
        >
          <span className="peer-indicator" />
          <span>{peerCount} device{peerCount === 1 ? '' : 's'}</span>
        </button>

        <button
          type="button"
          className="action-btn accent-btn"
          onClick={onOpenNetworkModal}
          title="Share with phones & devices on local Wi-Fi"
        >
          <Share2 size={15} />
          <span className="btn-label">Share on Network</span>
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          title="Toggle Dark/Light Mode"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
