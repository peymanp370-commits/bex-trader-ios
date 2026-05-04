import { useEffect, useState } from "react";
import { applyDocumentLanguage, getLanguage, setLanguage, type SupportedLanguage } from "../utils/i18n";

export function useLangState() {
  const [lang, setLangState] = useState<SupportedLanguage>(() => getLanguage());

  useEffect(() => {
    applyDocumentLanguage(lang);
  }, [lang]);

  useEffect(() => {
    const sync = () => setLangState(getLanguage());
    window.addEventListener("languageChange", sync as EventListener);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("languageChange", sync as EventListener);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    lang,
    setLang(next: unknown) {
      const value = setLanguage(next);
      setLangState(value);
      return value;
    },
  };
}
