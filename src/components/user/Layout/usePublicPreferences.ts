"use client";

import { useLayoutEffect, useState } from "react";

import {
  applyPublicTheme,
  DEFAULT_PUBLIC_PREFERENCES,
  preferenceCookie,
  PUBLIC_PREFERENCE_KEYS,
  type PublicPreferences,
  parseBooleanPreference,
  resolveDarkModePreference,
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
  initialPreferences: PublicPreferences = DEFAULT_PUBLIC_PREFERENCES,
  setIsSortedAscending?: (value: boolean) => void,
) {
  const [preferences, setPreferences] = useState<PublicPreferenceState>(() => ({
    isReachIconVisible: initialPreferences.isReachIconVisible,
    isSortOrderActive: initialPreferences.isSortedAscending,
    isDarkMode: resolveDarkModePreference(initialPreferences.isDarkMode),
  }));

  useLayoutEffect(() => {
    const nextReachVisibility = parseBooleanPreference(
      window.localStorage.getItem(PUBLIC_PREFERENCE_KEYS.reachIconVisible) ?? undefined,
      initialPreferences.isReachIconVisible,
    );
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.reachIconVisible, nextReachVisibility);

    const nextSortOrder = parseBooleanPreference(
      window.localStorage.getItem(PUBLIC_PREFERENCE_KEYS.sortedAscending) ?? undefined,
      initialPreferences.isSortedAscending,
    );
    setIsSortedAscending?.(nextSortOrder);
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.sortedAscending, nextSortOrder);

    const nextDarkMode = resolveDarkModePreference(initialPreferences.isDarkMode);
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.darkMode, nextDarkMode);

    setPreferences({
      isReachIconVisible: nextReachVisibility,
      isSortOrderActive: nextSortOrder,
      isDarkMode: nextDarkMode,
    });
  }, [initialPreferences, setIsSortedAscending]);

  useLayoutEffect(() => {
    applyPublicTheme(preferences.isDarkMode);
  }, [preferences.isDarkMode]);

  return { preferences, setPreferences, persistBooleanPreference };
}
