"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export type Language = "en" | "ur";

type LanguageContextValue = {
  language: Language;
  isUrdu: boolean;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "riaz-salai-language";
const LANGUAGE_EVENT = "riaz-salai-language-change";

export function LanguageProvider({
  children,
  initialLanguage = "en",
}: Readonly<{ children: React.ReactNode; initialLanguage?: Language }>) {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(LANGUAGE_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(LANGUAGE_EVENT, onChange);
    };
  }, []);
  const getSnapshot = useCallback((): Language => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "ur" || saved === "en" ? saved : initialLanguage;
  }, [initialLanguage]);
  const getServerSnapshot = useCallback(() => initialLanguage, [initialLanguage]);
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
  }, [language]);

  const value = useMemo(() => ({
    language,
    isUrdu: language === "ur",
    toggleLanguage: () => {
      const next = language === "en" ? "ur" : "en";
      window.localStorage.setItem(STORAGE_KEY, next);
      window.dispatchEvent(new Event(LANGUAGE_EVENT));
    },
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider.");
  return context;
}
