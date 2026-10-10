"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { db } from "./db";
import { tFor, DEFAULT_LOCALE, type Locale, type TranslationKeys } from "./i18n";

type Theme = "light" | "dark";

interface PreferencesContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKeys) => string;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [theme, setThemeState] = useState<Theme>("light");

  // Read preferences from Dexie on mount
  useEffect(() => {
    async function load() {
      try {
        const [localeSetting, themeSetting] = await Promise.all([
          db.settings.get("locale"),
          db.settings.get("theme"),
        ]);
        if (localeSetting?.value && (localeSetting.value === "fr" || localeSetting.value === "en")) {
          setLocaleState(localeSetting.value as Locale);
        }
        if (themeSetting?.value && (themeSetting.value === "light" || themeSetting.value === "dark")) {
          setThemeState(themeSetting.value as Theme);
        }
      } catch {
        // Dexie not available (SSR guard already handled, but just in case)
      }
    }
    load();
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const themeColor = theme === "dark" ? "#1A2B24" : "#2D4A3E";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  }, [theme]);

  // Apply locale to DOM
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    db.settings.put({ key: "locale", value: newLocale });
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    db.settings.put({ key: "theme", value: newTheme });
  }, []);

  const t = useMemo(() => tFor(locale), [locale]);

  return (
    <PreferencesContext value={{ locale, setLocale, t, theme, setTheme }}>
      {children}
    </PreferencesContext>
  );
}

export function useTranslation() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("useTranslation must be used within PreferencesProvider");
  return { t: ctx.t, locale: ctx.locale, setLocale: ctx.setLocale };
}

export function useTheme() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("useTheme must be used within PreferencesProvider");
  return { theme: ctx.theme, setTheme: ctx.setTheme };
}
