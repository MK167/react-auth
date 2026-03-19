/**
 * @fileoverview Global theme context — light / dark / custom theme support.
 *
 * ## Architecture
 *
 * Theming is implemented as a React Context (`ThemeContext`) rather than
 * CSS-only or a Zustand store because:
 * - It does NOT need to be shared with non-React code (unlike auth state).
 * - Context avoids prop-drilling while still being tree-scoped.
 * - The theme is a pure UI concern and does not belong in the business-logic
 *   layer (Zustand is reserved for server-derived state like auth and cart).
 *
 * ## Dark mode strategy
 *
 * Tailwind's `darkMode: 'class'` strategy is used (configured in
 * `tailwind.config.js`). When the theme is `'dark'`, the string `'dark'` is
 * added to `document.documentElement.classList`; all `dark:` utility variants
 * in component files then take effect automatically.
 *
 * ## Custom theme
 *
 * The `'custom'` mode applies user-supplied CSS custom properties directly to
 * `:root`. Any Tailwind utility that references a CSS variable (e.g.
 * `bg-[var(--color-primary)]`) will honour these overrides. This keeps the
 * custom-theme implementation entirely in CSS-land and avoids needing a
 * Tailwind config rebuild at runtime.
 *
 * ## Persistence
 *
 * The current theme selection is persisted to `localStorage` under the key
 * `'app-theme'` so that the user's preference survives page refreshes.
 * Custom theme colours are persisted separately under `'app-custom-theme'`.
 *
 * ## Accessibility
 *
 * Changing `prefers-color-scheme` via JavaScript is not possible, but by
 * toggling the `dark` class on `<html>` we ensure that all colour contrast
 * relationships defined with `dark:` variants are respected. Layouts that
 * render focusable elements should still meet WCAG AA contrast ratios in both
 * modes — test both light and dark in Lighthouse.
 *
 * @module themes/theme.context
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The three supported theme modes. */
export type ThemeMode = 'light' | 'dark' | 'custom';

/**
 * Colour tokens for the optional custom theme.
 * Each token maps to a CSS custom property set on `:root`.
 */
export type CustomTheme = {
  /** Primary brand colour (hex / rgb / hsl) */
  primary: string;
  /** Main page background colour */
  background: string;
  /** Card / surface background colour */
  surface: string;
  /** Default body text colour */
  text: string;
  /** Border / divider colour */
  border: string;
};

/** Shape of the value exposed by `ThemeContext`. */
export type ThemeContextValue = {
  /** Currently active theme mode */
  theme: ThemeMode;
  /**
   * Custom colour tokens, only non-null when `theme === 'custom'`.
   * Layouts can read these if they need to apply colours imperatively,
   * but in practice CSS variables handle this automatically.
   */
  customTheme: CustomTheme | null;
  /**
   * Toggles between `'light'` and `'dark'`. If the current theme is
   * `'custom'`, calling this resets to `'light'`.
   */
  toggleTheme: () => void;
  /**
   * Explicitly sets the active theme mode, with an optional custom palette
   * when `mode === 'custom'`.
   *
   * @param mode - Target theme mode.
   * @param custom - Custom colour tokens; required when `mode === 'custom'`.
   */
  setTheme: (mode: ThemeMode, custom?: CustomTheme) => void;
};

// ---------------------------------------------------------------------------
// Default custom theme (used when custom mode is activated without tokens)
// ---------------------------------------------------------------------------

const DEFAULT_CUSTOM_THEME: CustomTheme = {
  primary: '#6366f1',
  background: '#f8f7ff',
  surface: '#ffffff',
  text: '#1e1b4b',
  border: '#c7d2fe',
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('app-theme');
    if (saved === 'dark' || saved === 'light' || saved === 'custom') {
      return saved;
    }
  } catch {
    // localStorage unavailable (e.g. private browsing with restrictions)
  }
  return 'light';
}

function loadCustomTheme(): CustomTheme | null {
  try {
    const raw = localStorage.getItem('app-custom-theme');
    return raw ? (JSON.parse(raw) as CustomTheme) : null;
  } catch {
    return null;
  }
}

/**
 * Applies CSS custom properties for the custom theme to `:root`.
 * Removing them when switching away restores default Tailwind colours.
 */
function applyCustomProperties(tokens: CustomTheme): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', tokens.primary);
  root.style.setProperty('--color-background', tokens.background);
  root.style.setProperty('--color-surface', tokens.surface);
  root.style.setProperty('--color-text', tokens.text);
  root.style.setProperty('--color-border', tokens.border);
}

function removeCustomProperties(): void {
  const root = document.documentElement;
  root.style.removeProperty('--color-primary');
  root.style.removeProperty('--color-background');
  root.style.removeProperty('--color-surface');
  root.style.removeProperty('--color-text');
  root.style.removeProperty('--color-border');
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * `ThemeProvider` must wrap the entire application tree (place it in
 * `App.tsx` just inside the router) so that all layouts and pages can
 * consume `useTheme()`.
 *
 * On mount it reads the stored preference from `localStorage` and
 * immediately applies the correct class / CSS variables to avoid a flash
 * of the wrong theme (FOUC).
 */
export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(loadTheme);
  const [customTheme, setCustomTheme] = useState<CustomTheme | null>(
    loadCustomTheme,
  );

  // Apply theme to DOM whenever `theme` changes
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
      removeCustomProperties();
    } else if (theme === 'custom') {
      root.classList.remove('dark');
      const tokens = customTheme ?? DEFAULT_CUSTOM_THEME;
      applyCustomProperties(tokens);
    } else {
      root.classList.remove('dark');
      removeCustomProperties();
    }

    try {
      localStorage.setItem('app-theme', theme);
    } catch {
      // Storage write failure is non-fatal
    }
  }, [theme, customTheme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (mode: ThemeMode, custom?: CustomTheme) => {
    if (mode === 'custom') {
      const tokens = custom ?? DEFAULT_CUSTOM_THEME;
      setCustomTheme(tokens);
      try {
        localStorage.setItem('app-custom-theme', JSON.stringify(tokens));
      } catch {
        // Non-fatal
      }
    }
    setThemeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, customTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides access to the current theme mode and the action to toggle it.
 *
 * **Usage:**
 * ```tsx
 * function ThemeToggleButton() {
 *   const { theme, toggleTheme } = useTheme();
 *   return (
 *     <button onClick={toggleTheme} aria-label="Toggle theme">
 *       {theme === 'dark' ? '☀️' : '🌙'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @throws If called outside of a `ThemeProvider` tree.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
}
