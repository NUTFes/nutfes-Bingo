import { useLayoutEffect, useRef, useState } from "react";

import {
  applyPublicTheme,
  DEFAULT_PUBLIC_PREFERENCES,
  PUBLIC_PREFERENCE_KEYS,
  readPublicPreference,
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
  try {
    window.localStorage.setItem(key, value.toString());
  } catch {
    // Keep the page's in-memory preference when storage is unavailable.
  }
};

export function usePublicPreferences(
  eventId: string,
  setIsSortedAscending?: (value: boolean) => void,
) {
  const confirmedReachEventRef = useRef<string | null>(null);
  const [preferences, setPreferences] = useState<PublicPreferenceState>(() => ({
    isReachIconVisible: false,
    isSortOrderActive: DEFAULT_PUBLIC_PREFERENCES.isSortedAscending,
    isDarkMode: resolveDarkModePreference(DEFAULT_PUBLIC_PREFERENCES.isDarkMode),
  }));

  useLayoutEffect(() => {
    try {
      window.localStorage.removeItem(PUBLIC_PREFERENCE_KEYS.legacyReachIconVisible);
      document.cookie = `${PUBLIC_PREFERENCE_KEYS.legacyReachIconVisible}=; path=/; max-age=0; samesite=lax`;
    } catch {
      // Privacy modes may disable persistent storage and cookies.
    }
    const lastReachedEventId =
      readPublicPreference(PUBLIC_PREFERENCE_KEYS.lastReachedEventId) ??
      confirmedReachEventRef.current;
    setPreferences((previous) => ({
      ...previous,
      isReachIconVisible: shouldShowReachIcon(eventId, lastReachedEventId),
    }));
  }, [eventId]);

  useLayoutEffect(() => {
    const nextSortOrder = parseBooleanPreference(
      readPublicPreference(PUBLIC_PREFERENCE_KEYS.sortedAscending) ?? undefined,
      DEFAULT_PUBLIC_PREFERENCES.isSortedAscending,
    );
    setIsSortedAscending?.(nextSortOrder);
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.sortedAscending, nextSortOrder);

    const nextDarkMode = resolveDarkModePreference(DEFAULT_PUBLIC_PREFERENCES.isDarkMode);
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.darkMode, nextDarkMode);

    setPreferences((previous) => ({
      ...previous,
      isSortOrderActive: nextSortOrder,
      isDarkMode: nextDarkMode,
    }));
  }, [setIsSortedAscending]);

  useLayoutEffect(() => {
    applyPublicTheme(preferences.isDarkMode);
  }, [preferences.isDarkMode]);

  const markReachConfirmed = () => {
    confirmedReachEventRef.current = eventId;
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
