import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Everything Nazar remembers lives here, persisted on this device only. Nothing in this
 * file is sample data: every number on screen is derived from what the user (or a bait)
 * actually recorded.
 */

export type Lang = 'en' | 'hi';

/** Decoys that live inside the calculator disguise, the only place Nazar can observe them. */
export type BaitType = 'history' | 'menu';
export type Bait = { id: string; name: string; type: BaitType; createdAt: number; active: boolean };
/** A decoy really being opened inside this app. `wasMe` lets her exclude her own tests. */
export type BaitEvent = { id: string; baitId: string; at: number; durationMs?: number; wasMe?: boolean };

export type AnswerStatus = 'ok' | 'review' | 'skipped';
export type AccountAnswer = { status: AnswerStatus; note?: string; at: number };

export type QuietArea = 'mic' | 'camera' | 'location';
export type QuietEntry = { id: string; area: QuietArea; status: 'ok' | 'review'; note?: string; at: number };

export type TrackerResult = 'none' | 'tracker' | 'unknown' | 'incomplete';
export type TrackerType = 'airtag' | 'smarttag' | 'tile' | 'other' | 'unsure';
export type TrackerEntry = { id: string; at: number; result: TrackerResult; trackerType?: TrackerType; note?: string };

/** A snapshot copied into the Vault, so it survives even if its source is later deleted. */
export type Evidence =
  | { id: string; savedAt: number; kind: 'bait'; refId: string; eventAt: number; baitName: string; baitType: BaitType; durationMs?: number }
  | { id: string; savedAt: number; kind: 'tracker'; refId: string; eventAt: number; result: TrackerResult; trackerType?: TrackerType; note?: string }
  | { id: string; savedAt: number; kind: 'account'; refId: string; eventAt: number; checkId: string; note?: string }
  | { id: string; savedAt: number; kind: 'quiet'; refId: string; eventAt: number; area: QuietArea; note?: string };

type Data = {
  version: 1;
  lang: Lang | null;
  baits: Bait[];
  baitEvents: BaitEvent[];
  accountAnswers: Record<string, AccountAnswer>;
  quietEntries: QuietEntry[];
  trackerEntries: TrackerEntry[];
  evidence: Evidence[];
  planDone: Record<string, boolean>;
};

const KEY = 'nazar:data:v1';
const EMPTY: Data = {
  version: 1,
  lang: null,
  baits: [],
  baitEvents: [],
  accountAnswers: {},
  quietEntries: [],
  trackerEntries: [],
  evidence: [],
  planDone: {},
};

export type LoadStatus = 'loading' | 'ready' | 'error';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function useStoreValue() {
  const [data, setData] = useState<Data>(EMPTY);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [saveFailed, setSaveFailed] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setData({ ...EMPTY, ...(JSON.parse(raw) as Partial<Data>), version: 1 });
        setStatus('ready');
      })
      .catch(() => setStatus('error'))
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    // Never overwrite stored data with the empty defaults before (or after a failed) load.
    if (!loaded.current || status !== 'ready') return;
    AsyncStorage.setItem(KEY, JSON.stringify(data))
      .then(() => setSaveFailed(false))
      .catch(() => setSaveFailed(true));
  }, [data, status]);

  const update = useCallback((fn: (d: Data) => Data) => setData(fn), []);

  const actions = useMemo(
    () => ({
      setLang: (lang: Lang) => update((d) => ({ ...d, lang })),

      createBait: (name: string, type: BaitType) => {
        const bait: Bait = { id: uid(), name, type, createdAt: Date.now(), active: true };
        update((d) => ({ ...d, baits: [...d.baits, bait] }));
        return bait.id;
      },
      setBaitActive: (id: string, active: boolean) =>
        update((d) => ({ ...d, baits: d.baits.map((b) => (b.id === id ? { ...b, active } : b)) })),
      deleteBait: (id: string) =>
        update((d) => ({
          ...d,
          baits: d.baits.filter((b) => b.id !== id),
          baitEvents: d.baitEvents.filter((e) => e.baitId !== id),
        })),
      /** Called by the calculator when a decoy is actually opened. */
      recordBaitOpen: (baitId: string) => {
        const id = uid();
        update((d) => ({ ...d, baitEvents: [...d.baitEvents, { id, baitId, at: Date.now() }] }));
        return id;
      },
      finishBaitOpen: (eventId: string, durationMs: number) =>
        update((d) => ({ ...d, baitEvents: d.baitEvents.map((e) => (e.id === eventId ? { ...e, durationMs } : e)) })),
      setEventWasMe: (eventId: string, wasMe: boolean) =>
        update((d) => ({ ...d, baitEvents: d.baitEvents.map((e) => (e.id === eventId ? { ...e, wasMe } : e)) })),

      answerAccountCheck: (checkId: string, status: AnswerStatus, note?: string) =>
        update((d) => ({ ...d, accountAnswers: { ...d.accountAnswers, [checkId]: { status, note, at: Date.now() } } })),
      clearAccountCheck: (checkId: string) =>
        update((d) => {
          const { [checkId]: _, ...rest } = d.accountAnswers;
          return { ...d, accountAnswers: rest };
        }),

      addQuietEntry: (area: QuietArea, status: 'ok' | 'review', note?: string) =>
        update((d) => ({ ...d, quietEntries: [...d.quietEntries, { id: uid(), area, status, note, at: Date.now() }] })),

      addTrackerEntry: (result: TrackerResult, trackerType?: TrackerType, note?: string) => {
        const id = uid();
        update((d) => ({ ...d, trackerEntries: [...d.trackerEntries, { id, at: Date.now(), result, trackerType, note }] }));
        return id;
      },
      deleteTrackerEntry: (id: string) =>
        update((d) => ({ ...d, trackerEntries: d.trackerEntries.filter((t) => t.id !== id) })),

      saveEvidence: (item: DistributiveOmit<Evidence, 'id' | 'savedAt'>) =>
        update((d) =>
          d.evidence.some((e) => e.kind === item.kind && e.refId === item.refId)
            ? d
            : { ...d, evidence: [...d.evidence, { ...item, id: uid(), savedAt: Date.now() } as Evidence] },
        ),
      removeEvidence: (id: string) => update((d) => ({ ...d, evidence: d.evidence.filter((e) => e.id !== id) })),

      togglePlanStep: (key: string) => update((d) => ({ ...d, planDone: { ...d.planDone, [key]: !d.planDone[key] } })),
    }),
    [update],
  );

  return { data, status, saveFailed, ...actions };
}

type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;
export type Store = ReturnType<typeof useStoreValue>;

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}

/* ---------- Derived facts shared by Home, the pages and Exposure ---------- */

export function isToday(at: number, now = new Date()) {
  const d = new Date(at);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

/** Bait events that count as possible access: real opens she hasn't marked as her own. */
export function countedEvents(events: BaitEvent[]) {
  return events.filter((e) => !e.wasMe);
}

export function baitSummary(data: Data) {
  const active = data.baits.filter((b) => b.active);
  const events = countedEvents(data.baitEvents).filter((e) => data.baits.some((b) => b.id === e.baitId));
  const today = events.filter((e) => isToday(e.at));
  const latest = events.reduce<BaitEvent | undefined>((m, e) => (!m || e.at > m.at ? e : m), undefined);
  return { active, events, today, latest };
}

export function latestQuiet(entries: QuietEntry[], area: QuietArea) {
  return entries.filter((e) => e.area === area).reduce<QuietEntry | undefined>((m, e) => (!m || e.at > m.at ? e : m), undefined);
}

export function latestTracker(entries: TrackerEntry[]) {
  return entries.reduce<TrackerEntry | undefined>((m, e) => (!m || e.at > m.at ? e : m), undefined);
}
