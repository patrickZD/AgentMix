import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import zh from "./zh.json";

// Detect UI language from the OS / browser locale at startup.
// zh-* -> Chinese; everything else falls back to English (the complete catalog).
function detectLanguage(): "en" | "zh" {
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

export default i18n;
