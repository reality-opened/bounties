'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useEffect, useState } from 'react';

/**
 * Wraps ClerkProvider so the Clerk-hosted UI (sign-in modal, UserButton)
 * follows the site theme. Reads the theme that the blocking head script set on
 * <html data-theme>, then re-syncs on the `or-themechange` event dispatched by
 * ThemeToggle. SSR/first paint renders the light (default) appearance; Clerk's
 * UI only appears on interaction, well after mount, so there is no visible flash.
 */
export function ClerkThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () =>
      setIsDark(document.documentElement.dataset.theme === 'dark');
    sync();
    window.addEventListener('or-themechange', sync);
    return () => window.removeEventListener('or-themechange', sync);
  }, []);

  return (
    <ClerkProvider appearance={isDark ? { baseTheme: dark } : undefined}>
      {children}
    </ClerkProvider>
  );
}
