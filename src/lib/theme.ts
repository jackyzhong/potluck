// Theme setting (decision D4): follow the system by default, with an explicit
// System / Light / Dark choice saved per browser.
//
// The setting lives in localStorage and is applied as `data-theme` on <html>.
// `src/app/tokens.css` reads that attribute: "light" and "dark" force a theme,
// while "system" or no attribute follows `prefers-color-scheme`.

export type Theme = "system" | "light" | "dark";

export const THEMES: readonly Theme[] = ["system", "light", "dark"];
export const DEFAULT_THEME: Theme = "system";
export const THEME_STORAGE_KEY = "potluck:theme";

export function parseTheme(value: unknown): Theme | null {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value)
    ? (value as Theme)
    : null;
}

/** The saved theme, or "system" when nothing valid is saved (or storage is blocked). */
export function getStoredTheme(): Theme {
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY)) ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Set `data-theme` on <html> without saving anything. */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

/** Save the theme for this browser and apply it right away. */
export function setTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private mode). The theme still applies for this visit.
  }
  applyTheme(theme);
}

/**
 * Runs in <head> before first paint so the page never flashes the wrong theme.
 * With nothing saved it sets no attribute, and tokens.css follows the OS.
 * Keep it dependency-free: it is inlined as a string, not bundled.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark"||t==="system"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
