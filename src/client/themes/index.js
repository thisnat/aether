import tabula from './tabula.json';
import rhizome from './rhizome.json';
import ephemera from './ephemera.json';

// Built-in esoteric themes loaded from JSON specifications
export const BUILTIN_THEMES = [tabula, rhizome, ephemera];

// Legacy alias map to guarantee 100% backward compatibility
const LEGACY_ALIASES = {
  notion: 'tabula',
  roam: 'rhizome',
  arena: 'ephemera',
};

/**
 * Retrieve any custom modded themes saved in localStorage
 */
export function getCustomThemes() {
  try {
    const raw = localStorage.getItem('aether_custom_themes');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse custom themes from localStorage:', err);
    return [];
  }
}

/**
 * Get all available themes (built-in + modded)
 */
export function getAllThemes() {
  const custom = getCustomThemes();
  const customMap = new Map(custom.map((t) => [t.id, t]));
  // Builtin themes with custom overrides or extensions
  const combined = BUILTIN_THEMES.map((t) => customMap.get(t.id) || t);
  for (const c of custom) {
    if (!combined.some((t) => t.id === c.id)) {
      combined.push(c);
    }
  }
  return combined;
}

/**
 * Resolve theme definition by ID (supporting legacy identifiers)
 */
export function getTheme(id) {
  const resolvedId = LEGACY_ALIASES[id] || id;
  const all = getAllThemes();
  return all.find((t) => t.id === resolvedId) || tabula;
}

/**
 * Register a new modded theme from JSON definition
 */
export function registerTheme(themeDef) {
  if (!themeDef || !themeDef.id || !themeDef.name || !themeDef.modes) {
    throw new Error('Invalid theme definition JSON. Must contain id, name, and modes.');
  }
  const custom = getCustomThemes().filter((t) => t.id !== themeDef.id);
  custom.push(themeDef);
  localStorage.setItem('aether_custom_themes', JSON.stringify(custom));
  return getAllThemes();
}

/**
 * Generate CSS variable block from a theme's JSON tokens for a given mode ('dark' | 'light')
 */
export function generateCssVariables(theme, mode = 'dark') {
  const m = theme.modes[mode] || theme.modes.dark || {};
  const t = theme.typography || {};
  const r = theme.radii || {};

  return `
:root {
  --font-ui: ${t.fontUi || 'Arial, -apple-system, BlinkMacSystemFont, sans-serif'};
  --font-title: ${t.fontTitle || t.fontUi || 'inherit'};
  --font-mono: ${t.fontMono || "'SF Mono', Menlo, Monaco, monospace"};
  --title-size: ${t.titleSize || '32px'};
  --title-weight: ${t.titleWeight || '700'};
  --heading-weight: ${t.headingWeight || '600'};

  --radius-xs: ${r.xs || '4px'};
  --radius-sm: ${r.sm || '6px'};
  --radius-md: ${r.md || '8px'};
  --radius-lg: ${r.lg || '8px'};
  --radius-pill: ${r.pill || '9999px'};

  --bg-app: ${m.bgApp || '#191919'};
  --bg-sidebar: ${m.bgSidebar || '#202020'};
  --bg-sidebar-hover: ${m.bgSidebarHover || 'rgba(255, 255, 255, 0.06)'};
  --bg-card: ${m.bgCard || '#252525'};
  --bg-card-accent: ${m.bgCardAccent || 'rgba(0, 117, 222, 0.12)'};
  --bg-card-hover: ${m.bgCardHover || 'rgba(255, 255, 255, 0.08)'};
  --bg-editor: ${m.bgEditor || m.bgApp || '#191919'};
  --bg-preview: ${m.bgPreview || m.bgApp || '#191919'};
  --border-color: ${m.borderColor || 'rgba(255, 255, 255, 0.09)'};
  --border-focus: ${m.borderFocus || '#0075de'};
  --input-border: ${m.inputBorder || 'rgba(255, 255, 255, 0.12)'};

  --text-main: ${m.textMain || 'rgba(255, 255, 255, 0.92)'};
  --text-muted: ${m.textMuted || '#9b9b9b'};
  --text-dim: ${m.textDim || '#6b6b6b'};

  --accent: ${m.accent || '#0075de'};
  --accent-hover: ${m.accentHover || '#097fe8'};
  --accent-light: ${m.accentLight || 'rgba(0, 117, 222, 0.18)'};
  --accent-secondary-bg: ${m.accentSecondaryBg || 'rgba(0, 117, 222, 0.15)'};
  --accent-secondary-text: ${m.accentSecondaryText || '#62aef0'};

  --success: ${m.success || '#27918d'};
  --danger: ${m.danger || '#f64932'};
  --warning: ${m.warning || '#ffb110'};
  --purple: ${m.purple || '#9849e8'};
  --orange: ${m.orange || '#ff6d00'};
  --sky-blue: ${m.skyBlue || '#62aef0'};
  --dark-blue: ${m.darkBlue || '#005bab'};

  --shadow-sm: ${m.shadowSm || 'none'};
  --shadow-md: ${m.shadowMd || 'none'};
  --shadow-lg: ${m.shadowLg || 'none'};

  --sidebar-width: 270px;
  --topbar-height: 48px;
  --statusbar-height: 30px;
}
`;
}

/**
 * Apply the JSON-configured theme tokens dynamically to the document
 */
export function applyTheme(theme, mode = 'dark') {
  if (typeof document === 'undefined') return;

  const css = generateCssVariables(theme, mode);
  let styleEl = document.getElementById('aether-theme-vars');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'aether-theme-vars';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;

  document.documentElement.setAttribute('data-theme', theme.id);
  document.documentElement.setAttribute('data-mode', mode);
}
