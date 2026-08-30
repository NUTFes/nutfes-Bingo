import { useLayoutEffect, useState } from "react";

import {
  applyPublicTheme,
  DEFAULT_PUBLIC_PREFERENCES,
  preferenceCookie,
  PUBLIC_PREFERENCE_KEYS,
  parseBooleanPreference,
  resolveDarkModePreference,
  shouldShowReachIcon,
} from "@/types/bingo/public-preferences";

export type PublicPreferenceState = {
  isReachIconVisible: boolean;
  isSortOrderActive: boolean;
  isDarkMode: boolean;
};

export const persistBooleanPreference = (key: string, value: boolean) => {
  window.localStorage.setItem(key, value.toString());
  document.cookie = preferenceCookie(key, value);
};

export function usePublicPreferences(
  eventId: string,
  setIsSortedAscending?: (value: boolean) => void,
) {
  const [preferences, setPreferences] = useState<PublicPreferenceState>(() => ({
    isReachIconVisible: false,
    isSortOrderActive: DEFAULT_PUBLIC_PREFERENCES.isSortedAscending,
    isDarkMode: resolveDarkModePreference(DEFAULT_PUBLIC_PREFERENCES.isDarkMode),
  }));

  useLayoutEffect(() => {
    let lastReachedEventId: string | null = null;
    try {
      window.localStorage.removeItem(PUBLIC_PREFERENCE_KEYS.legacyReachIconVisible);
      lastReachedEventId = window.localStorage.getItem(PUBLIC_PREFERENCE_KEYS.lastReachedEventId);
    } catch {
      // Privacy modes may disable persistent storage; keep the action available.
    }
    document.cookie = `${PUBLIC_PREFERENCE_KEYS.legacyReachIconVisible}=; path=/; max-age=0; samesite=lax`;

    const nextSortOrder = parseBooleanPreference(
      window.localStorage.getItem(PUBLIC_PREFERENCE_KEYS.sortedAscending) ?? undefined,
      DEFAULT_PUBLIC_PREFERENCES.isSortedAscending,
    );
    setIsSortedAscending?.(nextSortOrder);
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.sortedAscending, nextSortOrder);

    const nextDarkMode = resolveDarkModePreference(DEFAULT_PUBLIC_PREFERENCES.isDarkMode);
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.darkMode, nextDarkMode);

    setPreferences({
      isReachIconVisible: shouldShowReachIcon(eventId, lastReachedEventId),
      isSortOrderActive: nextSortOrder,
      isDarkMode: nextDarkMode,
    });
  }, [eventId, setIsSortedAscending]);

  useLayoutEffect(() => {
    applyPublicTheme(preferences.isDarkMode);
  }, [preferences.isDarkMode]);

  const markReachConfirmed = () => {
    if (eventId !== "") {
      try {
        window.localStorage.setItem(PUBLIC_PREFERENCE_KEYS.lastReachedEventId, eventId);
      } catch {
        // The in-memory state still prevents duplicate interaction in this page.
      }
    }
    setPreferences((previous) => ({ ...previous, isReachIconVisible: false }));
  };

  return { preferences, setPreferences, persistBooleanPreference, markReachConfirmed };
}
