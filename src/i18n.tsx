import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { strings, type Lang } from './strings';

type I18n = { lang: Lang; setLang: (l: Lang) => void; t: (typeof strings)['en'] };

const Ctx = createContext<I18n | null>(null);

const STORAGE_KEY = 'nazar-lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'hi') return saved;
  } catch {
    /* storage unavailable — fall through */
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('hi') ? 'hi' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  };

  // Keep <html lang> and the page title in sync so screen readers pronounce Hindi correctly.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = strings[lang].meta.htmlTitle;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t: strings[lang] }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used inside I18nProvider');
  return v;
}
