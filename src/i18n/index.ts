import { useMemo } from 'react';

import { Lang, useStore } from '../store';
import { en, TKey } from './en';
import { hi } from './hi';

const DICTS: Record<Lang, Record<TKey, string>> = { en, hi };
export type Params = Record<string, string | number>;
export type { TKey };

function fill(s: string, params?: Params) {
  return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : s;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Formats with Intl where available (web, Hermes with Intl), falling back to a fixed format. */
function fmtTime(at: number, lang: Lang) {
  try {
    return new Date(at).toLocaleTimeString(lang === 'hi' ? 'hi-IN' : 'en-IN', { hour: 'numeric', minute: '2-digit' });
  } catch {
    const d = new Date(at);
    const h = d.getHours() % 12 || 12;
    return `${h}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  }
}

function fmtDate(at: number, lang: Lang) {
  try {
    return new Date(at).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    const d = new Date(at);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function useT() {
  const { data, setLang } = useStore();
  const lang: Lang = data.lang ?? 'en';

  return useMemo(() => {
    const dict = DICTS[lang];
    const t = (key: TKey, params?: Params) => fill(dict[key] ?? en[key], params);
    /** Picks `${base}_one` or `${base}_other` and fills {n}. */
    const tn = (base: string, n: number, params?: Params) =>
      t(`${base}_${n === 1 ? 'one' : 'other'}` as TKey, { n, ...params });
    const time = (at: number) => fmtTime(at, lang);
    const date = (at: number) => fmtDate(at, lang);
    /** "Today, 9:41 PM", "Yesterday, …" or "17 Oct 2026, 9:41 PM", in the user's local time. */
    const when = (at: number) => {
      const d = new Date(at);
      const now = new Date();
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      if (sameDay(d, now)) return t('when.today', { time: time(at) });
      if (sameDay(d, yest)) return t('when.yesterday', { time: time(at) });
      return `${date(at)}, ${time(at)}`;
    };
    const dur = (ms: number) => {
      const s = Math.max(1, Math.round(ms / 1000));
      return s < 60 ? t('dur.sec', { n: s }) : t('dur.min', { n: Math.round(s / 60) });
    };
    return { t, tn, lang, setLang, time, date, when, dur };
  }, [lang, setLang]);
}
