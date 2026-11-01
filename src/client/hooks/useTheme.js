import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAllThemes, getTheme, applyTheme } from '../themes';

export { getAllThemes, getTheme, registerTheme } from '../themes';

export function useTheme() {
  const [themeId, setThemeId] = useState(() => {
    const saved = localStorage.getItem('aether_theme_id');
    // Map legacy ids if needed
    if (saved === 'notion') return 'tabula';
    if (saved === 'roam') return 'rhizome';
    if (saved === 'arena') return 'ephemera';
    return saved || 'tabula';
  });

  const [colorMode, setColorMode] = useState(() => {
    const saved = localStorage.getItem('aether_color_mode');
    if (saved === 'dark' || saved === 'light') return saved;
    const legacy = localStorage.getItem('aether_theme');
    if (legacy === 'dark' || legacy === 'light') return legacy;
    return 'dark';
  });

  const availableThemes = useMemo(() => {
    return getAllThemes();
  }, [themeId]);

  const activeTheme = useMemo(() => {
    return getTheme(themeId);
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem('aether_theme_id', themeId);
    localStorage.setItem('aether_color_mode', colorMode);
    localStorage.setItem('aether_theme', colorMode);

    // Apply JSON-driven CSS variables and data attributes
    applyTheme(activeTheme, colorMode);

    // Swap highlight.js code theme
    const themeLink = document.getElementById('highlight-theme');
    if (themeLink) {
      themeLink.href =
        colorMode === 'light' ? '/vendor/highlight-light.css' : '/vendor/highlight-dark.css';
    }

    // Dynamic favicon accent color matching active theme
    const favicon = document.querySelector("link[rel='icon']");
    if (favicon) {
      const modeConfig = activeTheme.modes[colorMode] || activeTheme.modes.dark;
      const accent = modeConfig.accent || activeTheme.accentColor || '#0075DE';
      const encodedAccent = encodeURIComponent(accent);
      favicon.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><polygon points='50,15 90,85 10,85' fill='${encodedAccent}'/></svg>`;
    }
  }, [activeTheme, themeId, colorMode]);

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const selectTheme = useCallback((id) => {
    const resolved = getTheme(id);
    if (resolved) {
      setThemeId(resolved.id);
    }
  }, []);

  return {
    theme: themeId,
    themeDef: activeTheme,
    setTheme: selectTheme,
    colorMode,
    setColorMode,
    toggleColorMode,
    isDark: colorMode === 'dark',
    availableThemes,
    toggleTheme: toggleColorMode,
  };
}
