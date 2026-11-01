import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sun, Moon } from 'lucide-react';

export function ThemePicker({
  currentTheme,
  colorMode,
  availableThemes = [],
  onSelectTheme,
  onToggleColorMode,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeThemeObj = availableThemes.find((t) => t.id === currentTheme) || availableThemes[0];

  return (
    <div className="theme-picker-container" ref={containerRef}>
      <button
        type="button"
        className={`icon-btn theme-picker-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Change Theme (Active: ${activeThemeObj?.name || 'Tabula'})`}
        aria-label="Change Theme"
        aria-expanded={isOpen}
      >
        <Palette size={16} />
      </button>

      {isOpen && (
        <div className="theme-dropdown-menu">
          <div className="theme-dropdown-header">
            <span className="theme-dropdown-title">Theme</span>
            <span className="theme-dropdown-badge">{activeThemeObj?.name}</span>
          </div>

          <div className="theme-options-list">
            {availableThemes.map((t) => {
              const isSelected = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`theme-option-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectTheme(t.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="theme-option-left">
                    <span
                      className="theme-swatch"
                      style={{ backgroundColor: t.accentColor }}
                      aria-hidden="true"
                    />
                    <div className="theme-option-info">
                      <span className="theme-option-name">{t.name}</span>
                      <span className="theme-option-subtitle">{t.subtitle}</span>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="theme-check-icon" />}
                </button>
              );
            })}
          </div>

          <div className="theme-dropdown-divider" />

          <div className="theme-dropdown-footer">
            <span className="theme-mode-label">Appearance</span>
            <div className="theme-mode-pills">
              <button
                type="button"
                className={`theme-mode-pill ${colorMode === 'light' ? 'active' : ''}`}
                onClick={() => {
                  if (colorMode !== 'light') onToggleColorMode();
                }}
              >
                <Sun size={12} />
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`theme-mode-pill ${colorMode === 'dark' ? 'active' : ''}`}
                onClick={() => {
                  if (colorMode !== 'dark') onToggleColorMode();
                }}
              >
                <Moon size={12} />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
