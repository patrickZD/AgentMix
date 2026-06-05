import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import zh from "./zh.json";

export type Lang = "en" | "zh";

// Where a manual language choice is persisted (DESIGN.md §2: the selection is
// remembered across launches). localStorage survives in the Tauri WebView.
const LANG_STORAGE_KEY = "agentmix.lang";

// Resolve the startup language: a persisted choice wins; otherwise detect from
// the OS / browser locale. zh-* -> Chinese; everything else falls back to
// English (the complete catalog).
function detectLanguage(): Lang {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(LANG_STORAGE_KEY) : null;
  if (stored === "en" || stored === "zh") return stored;
  const locale = typeof navigator !== "undefined" ? navigator.language : "en";
  return locale.toLowerCase().startsWith("zh") ? "zh" : "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// Switch the UI language and persist the choice so the next launch keeps it.
export function changeLanguage(lng: Lang): void {
  void i18n.changeLanguage(lng);
  if (typeof localStorage !== "undefined") localStorage.setItem(LANG_STORAGE_KEY, lng);
}

export default i18n;
