'use client';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Read the already-applied theme from documentElement (set by inline script).
    const current =
      (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) ??
      'light';
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('or-theme', next);
    } catch {
      // localStorage unavailable — proceed silently
    }
    // Dispatch custom event so canvas components can update their bg/fog colours.
    window.dispatchEvent(
      new CustomEvent('or-themechange', { detail: { theme: next } }),
    );
    setTheme(next);
  }

  if (!mounted) {
    // Render placeholder to avoid layout shift, but hide interactive content
    // until we know the real theme (avoids a momentary wrong-icon flash).
    return (
      <button
        className="theme-toggle"
        aria-label="Toggle theme"
        style={{ visibility: 'hidden' }}
        type="button"
      >
        ○
      </button>
    );
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      }
      type="button"
    >
      {theme === 'dark' ? '○' : '●'}
    </button>
  );
}
