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
  isDarkMode: true,
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

const PUBLIC_THEME_COLORS = {
  darkMain: "#3CE0E8",
  lightMain: "#1B339B",
  darkSub: "#1B2D7B",
  lightSub: "#F6F8FF",
  darkBackground: "#111D53",
  lightBackground: "#FCFCFC",
  darkNumberSurface: "#111D53",
  lightNumberSurface: "#FCFCFC",
  darkNumberText: "#F6F8FF",
  lightNumberText: "#1B339B",
  darkNumberAccent: "#1B339B",
  lightNumberAccent: "#5EE4EB",
  darkCardShadow: "#0BA4C8",
  lightCardShadow: "#0BA4C8",
  darkNavigationBackground: "rgb(27 45 123 / 68%)",
  lightNavigationBackground: "rgb(188 189 192 / 25%)",
  darkNavigationItemBackground: "#111D53",
  lightNavigationItemBackground: "#F6F8FF",
  darkNavigationActiveForeground: "#111D53",
  lightNavigationActiveForeground: "#F6F8FF",
  darkNavTopShadow: "color-mix(in srgb, #0BA4C8 45%, transparent)",
  lightNavTopShadow: "color-mix(in srgb, #0BA4C8 32%, transparent)",
  darkHelpBg: "#1B2D7B",
  lightHelpBg: "#F6F8FF",
} as const;

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

  const root = document.documentElement;
  root.style.setProperty(
    "--main-color",
    isDarkMode ? PUBLIC_THEME_COLORS.darkMain : PUBLIC_THEME_COLORS.lightMain,
  );
  root.style.setProperty(
    "--sub-color",
    isDarkMode ? PUBLIC_THEME_COLORS.darkSub : PUBLIC_THEME_COLORS.lightSub,
  );
  root.style.setProperty(
    "--background-color",
    isDarkMode ? PUBLIC_THEME_COLORS.darkBackground : PUBLIC_THEME_COLORS.lightBackground,
  );
  root.style.setProperty(
    "--number-surface-color",
    isDarkMode ? PUBLIC_THEME_COLORS.darkNumberSurface : PUBLIC_THEME_COLORS.lightNumberSurface,
  );
  root.style.setProperty(
    "--number-text-color",
    isDarkMode ? PUBLIC_THEME_COLORS.darkNumberText : PUBLIC_THEME_COLORS.lightNumberText,
  );
  root.style.setProperty(
    "--number-accent-color",
    isDarkMode ? PUBLIC_THEME_COLORS.darkNumberAccent : PUBLIC_THEME_COLORS.lightNumberAccent,
  );
  root.style.setProperty(
    "--card-shadow-color",
    isDarkMode ? PUBLIC_THEME_COLORS.darkCardShadow : PUBLIC_THEME_COLORS.lightCardShadow,
  );
  root.style.setProperty(
    "--navigation-background-color",
    isDarkMode
      ? PUBLIC_THEME_COLORS.darkNavigationBackground
      : PUBLIC_THEME_COLORS.lightNavigationBackground,
  );
  root.style.setProperty(
    "--navigation-item-background-color",
    isDarkMode
      ? PUBLIC_THEME_COLORS.darkNavigationItemBackground
      : PUBLIC_THEME_COLORS.lightNavigationItemBackground,
  );
  root.style.setProperty(
    "--navigation-active-foreground-color",
    isDarkMode
      ? PUBLIC_THEME_COLORS.darkNavigationActiveForeground
      : PUBLIC_THEME_COLORS.lightNavigationActiveForeground,
  );
  root.style.setProperty(
    "--nav-top-shadow-color",
    isDarkMode ? PUBLIC_THEME_COLORS.darkNavTopShadow : PUBLIC_THEME_COLORS.lightNavTopShadow,
  );
  root.style.setProperty(
    "--help-bg-color",
    isDarkMode ? PUBLIC_THEME_COLORS.darkHelpBg : PUBLIC_THEME_COLORS.lightHelpBg,
  );
  root.dataset.theme = isDarkMode ? "dark" : "light";
};

export const publicThemeBootstrapScript = (fallbackDarkMode: boolean) => `
(() => {
  const key = "${PUBLIC_PREFERENCE_KEYS.darkMode}";
  const stored = window.localStorage.getItem(key);
  const isDarkMode = stored === "true" ? true : stored === "false" ? false : ${fallbackDarkMode};
  const root = document.documentElement;
  root.style.setProperty("--main-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkMain}" : "${PUBLIC_THEME_COLORS.lightMain}");
  root.style.setProperty("--sub-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkSub}" : "${PUBLIC_THEME_COLORS.lightSub}");
  root.style.setProperty("--background-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkBackground}" : "${PUBLIC_THEME_COLORS.lightBackground}");
  root.style.setProperty("--number-surface-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkNumberSurface}" : "${PUBLIC_THEME_COLORS.lightNumberSurface}");
  root.style.setProperty("--number-text-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkNumberText}" : "${PUBLIC_THEME_COLORS.lightNumberText}");
  root.style.setProperty("--number-accent-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkNumberAccent}" : "${PUBLIC_THEME_COLORS.lightNumberAccent}");
  root.style.setProperty("--card-shadow-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkCardShadow}" : "${PUBLIC_THEME_COLORS.lightCardShadow}");
  root.style.setProperty("--navigation-background-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkNavigationBackground}" : "${PUBLIC_THEME_COLORS.lightNavigationBackground}");
  root.style.setProperty("--navigation-item-background-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkNavigationItemBackground}" : "${PUBLIC_THEME_COLORS.lightNavigationItemBackground}");
  root.style.setProperty("--navigation-active-foreground-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkNavigationActiveForeground}" : "${PUBLIC_THEME_COLORS.lightNavigationActiveForeground}");
  root.style.setProperty("--nav-top-shadow-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkNavTopShadow}" : "${PUBLIC_THEME_COLORS.lightNavTopShadow}");
  root.style.setProperty("--help-bg-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkHelpBg}" : "${PUBLIC_THEME_COLORS.lightHelpBg}");
  root.dataset.theme = isDarkMode ? "dark" : "light";
})();
`;
