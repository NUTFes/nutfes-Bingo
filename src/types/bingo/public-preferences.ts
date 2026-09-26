export const PUBLIC_PREFERENCE_KEYS = {
  darkMode: "isDarkMode",
  sortedAscending: "isSortedAscending",
  lastReachedEventId: "lastReachedEventId",
  legacyReachIconVisible: "isReachIconVisible",
} as const;

interface PublicPreferences {
  isDarkMode: boolean;
  isSortedAscending: boolean;
}

export const DEFAULT_PUBLIC_PREFERENCES: PublicPreferences = {
  isDarkMode: false,
  isSortedAscending: false,
};

export const parseBooleanPreference = (value: string | undefined, fallback: boolean) => {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
};

export const shouldShowReachIcon = (eventId: string, lastReachedEventId: string | null) =>
  eventId !== "" && eventId !== lastReachedEventId;

export const readPublicPreference = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const resolveDarkModePreference = (fallback: boolean) => {
  if (typeof window === "undefined") {
    return fallback;
  }

  return parseBooleanPreference(
    readPublicPreference(PUBLIC_PREFERENCE_KEYS.darkMode) ?? undefined,
    fallback,
  );
};

export const applyPublicTheme = (isDarkMode: boolean) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
};

export const publicThemeBootstrapScript = (fallbackDarkMode: boolean) => `
(() => {
  let stored = null;
  try {
    stored = window.localStorage.getItem("${PUBLIC_PREFERENCE_KEYS.darkMode}");
  } catch {
    // Continue with the default theme when persistent storage is blocked.
  }
  const isDarkMode = stored === "true" ? true : stored === "false" ? false : ${fallbackDarkMode};
  document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
})();
`;
