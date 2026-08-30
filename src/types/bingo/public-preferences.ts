export const PUBLIC_PREFERENCE_KEYS = {
  darkMode: "isDarkMode",
  sortedAscending: "isSortedAscending",
  lastReachedEventId: "lastReachedEventId",
} as const;

export const DEFAULT_PUBLIC_PREFERENCES = {
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

export const resolveDarkModePreference = (fallback: boolean) =>
  parseBooleanPreference(
    window.localStorage.getItem(PUBLIC_PREFERENCE_KEYS.darkMode) ?? undefined,
    fallback,
  );

export const applyPublicTheme = (isDarkMode: boolean) => {
  document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
};
