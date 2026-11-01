import React from 'react';
import { PanelLeft, Share2, Sun, Moon, GitFork } from 'lucide-react';
import { ModeSwitcher } from './ModeSwitcher';
import { ThemePicker } from './ThemePicker';

export function Topbar({
  activeNotePath,
  mode,
  onSelectMode,
  peerCount,
  networkSharingEnabled = false,
  theme,
  colorMode = 'dark',
  availableThemes = [],
  onSelectTheme,
  onToggleColorMode,
  onToggleTheme,
  onToggleSidebar,
  onOpenNetworkModal,
  onOpenGraphModal,
}) {
  const handleToggleColor = onToggleColorMode || onToggleTheme;

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
          className="icon-btn"
          onClick={onOpenGraphModal}
          title="Open Graph View (Nodes)"
        >
          <GitFork size={17} />
        </button>

        {networkSharingEnabled ? (
          <button
            type="button"
            className="peer-badge active"
            onClick={onOpenNetworkModal}
            title="Local network sharing is active"
          >
            <span className="peer-indicator" />
            <span>
              {peerCount} device{peerCount === 1 ? '' : 's'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="peer-badge disabled"
            onClick={onOpenNetworkModal}
            title="Local network sharing is disabled (localhost only)"
          >
            <span className="peer-indicator disabled" />
            <span>Local only</span>
          </button>
        )}

        <button
          type="button"
          className={`action-btn ${networkSharingEnabled ? 'accent-btn' : 'secondary-btn'}`}
          onClick={onOpenNetworkModal}
          title={
            networkSharingEnabled
              ? 'Local network sharing is active'
              : 'Local network sharing is disabled - click to enable'
          }
        >
          <Share2 size={15} />
          <span className="btn-label">{networkSharingEnabled ? 'Sharing On' : 'Share'}</span>
        </button>

        <ThemePicker
          currentTheme={theme}
          colorMode={colorMode}
          availableThemes={availableThemes}
          onSelectTheme={onSelectTheme}
          onToggleColorMode={handleToggleColor}
        />

        <button
          type="button"
          className="icon-btn"
          onClick={handleToggleColor}
          title={colorMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {colorMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
