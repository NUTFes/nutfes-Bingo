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
  main: "#FFD607",
  sub: "#FFF8DC",
  darkBackground: "#2C252F",
  lightBackground: "#FFFFFF",
  darkNumberAccent: "#1a171e",
  lightNumberAccent: "var(--sub-color)",
  darkFooterBorder: "var(--main-color)",
  lightFooterBorder: "#000000",
  darkNavTopShadow: "var(--main-color)",
  lightNavTopShadow: "transparent",
  darkHelpBg: "#2C252F",
  lightHelpBg: "var(--sub-color)",
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
  root.style.setProperty("--main-color", PUBLIC_THEME_COLORS.main);
  root.style.setProperty("--sub-color", PUBLIC_THEME_COLORS.sub);
  root.style.setProperty(
    "--background-color",
    isDarkMode ? PUBLIC_THEME_COLORS.darkBackground : PUBLIC_THEME_COLORS.lightBackground,
  );
  root.style.setProperty(
    "--number-accent-color",
    isDarkMode ? PUBLIC_THEME_COLORS.darkNumberAccent : PUBLIC_THEME_COLORS.lightNumberAccent,
  );
  root.style.setProperty(
    "--footer-border-color",
    isDarkMode ? PUBLIC_THEME_COLORS.darkFooterBorder : PUBLIC_THEME_COLORS.lightFooterBorder,
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
  root.style.setProperty("--main-color", "${PUBLIC_THEME_COLORS.main}");
  root.style.setProperty("--sub-color", "${PUBLIC_THEME_COLORS.sub}");
  root.style.setProperty("--background-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkBackground}" : "${PUBLIC_THEME_COLORS.lightBackground}");
  root.style.setProperty("--number-accent-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkNumberAccent}" : "${PUBLIC_THEME_COLORS.lightNumberAccent}");
  root.style.setProperty("--footer-border-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkFooterBorder}" : "${PUBLIC_THEME_COLORS.lightFooterBorder}");
  root.style.setProperty("--nav-top-shadow-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkNavTopShadow}" : "${PUBLIC_THEME_COLORS.lightNavTopShadow}");
  root.style.setProperty("--help-bg-color", isDarkMode ? "${PUBLIC_THEME_COLORS.darkHelpBg}" : "${PUBLIC_THEME_COLORS.lightHelpBg}");
  root.dataset.theme = isDarkMode ? "dark" : "light";
})();
`;
