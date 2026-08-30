export const PUBLIC_PREFERENCE_KEYS = {
  darkMode: "isDarkMode",
  sortedAscending: "isSortedAscending",
  lastReachedEventId: "lastReachedEventId",
  legacyReachIconVisible: "isReachIconVisible",
} as const;

export interface PublicPreferences {
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

export const preferenceCookie = (key: string, value: boolean) =>
  `${key}=${value}; path=/; max-age=31536000; samesite=lax`;

export const shouldShowReachIcon = (eventId: string, lastReachedEventId: string | null) =>
  eventId !== "" && eventId !== lastReachedEventId;

export const resolveDarkModePreference = (fallback: boolean) => {
  if (typeof window === "undefined") {
    return fallback;
  }

  return parseBooleanPreference(
    window.localStorage.getItem(PUBLIC_PREFERENCE_KEYS.darkMode) ?? undefined,
    fallback,
  );
};

export const applyPublicTheme = (isDarkMode: boolean) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
};
