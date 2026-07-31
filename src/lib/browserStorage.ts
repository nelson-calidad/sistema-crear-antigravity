/**
 * Local storage is an optional performance cache. Some mobile browsers can
 * temporarily deny access to it, so it must never prevent the app from
 * rendering.
 */
export const readStoredValue = (key: string): string | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writeStoredValue = (key: string, value: string) => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Storage is only a cache; the app remains usable without it.
  }
};

export const removeStoredValue = (key: string) => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage is only a cache; the app remains usable without it.
  }
};
