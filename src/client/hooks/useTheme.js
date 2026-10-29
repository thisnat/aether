import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('aether_theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('aether_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);

    const themeLink = document.getElementById('highlight-theme');
    if (themeLink) {
      themeLink.href = theme === 'light' ? '/vendor/highlight-light.css' : '/vendor/highlight-dark.css';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme };
}
