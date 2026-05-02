import { themeStorageKey } from "./storage-key";

/**
 * Synchronous script body that runs in the document `<head>` before paint to
 * apply the user's theme preference (or fall back to the OS setting) without a
 * flash of the wrong theme.
 *
 * Inlined as a string so it can run before React hydrates.
 */
export const themeInitScript = `(() => {
  try {
    const storageKey = ${JSON.stringify(themeStorageKey)};
    const stored = window.localStorage.getItem(storageKey);
    const explicitDark = stored === "dark";
    const explicitLight = stored === "light";
    const systemDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = explicitDark || (!explicitLight && systemDark);
    const root = document.documentElement;
    if (shouldBeDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } catch (_error) {
    /* localStorage / matchMedia unavailable — leave default light theme. */
  }
})();`;
