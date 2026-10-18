import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Everything Nazar remembers lives here, persisted on this device only. Nothing in this
 * file is sample data: sample records for demos live in sample.ts and are never stored.
 */

export type Lang = 'en' | 'hi';

/** Decoys that live inside the calculator disguise, the only place Nazar can observe them. */
export type BaitType = 'history' | 'menu';
export type Bait = { id: string; name: string; type: BaitType; createdAt: number; active: boolean };

/** Her answer to "Was this you?" for a recorded event. Undefined means not reviewed yet. */
export type EventReview = 'me' | 'notMe' | 'unsure';
/** A decoy really being opened inside this app. */
export type BaitEvent = { id: string; baitId: string; at: number; durationMs?: number; review?: EventReview };

/** Email templates for a private-link bait sent to her own inbox. None impersonate a brand. */
export type TemplateId = 'password_setup' | 'security_review' | 'email_verification' | 'new_device';
/**
 * not_sent: created, never sent. unavailable: no email service is configured, so nothing was sent.
 * sent / failed: the configured service's actual answer.
 */
export type SendStatus = 'not_sent' | 'sending' | 'sent' | 'failed' | 'unavailable';
export type EmailBait = {
  id: string;
  name: string;
  template: TemplateId;
  recipient: string;
  createdAt: number;
  active: boolean;
  send: { status: SendStatus; at?: number; error?: string };
  remoteId?: string;
};
/** A link-open reported by the bait service. Never created locally. */
export type LinkEvent = { id: string; baitId: string; at: number; detail?: string; review?: EventReview };

export type AnswerStatus = 'ok' | 'review' | 'skipped';
export type AccountAnswer = { status: AnswerStatus; note?: string; at: number };

export type QuietArea = 'mic' | 'camera' | 'location';
export type QuietEntry = { id: string; area: QuietArea; status: 'ok' | 'review'; note?: string; at: number };

export type TrackerResult = 'none' | 'tracker' | 'unknown' | 'incomplete';
export type TrackerType = 'airtag' | 'smarttag' | 'tile' | 'other' | 'unsure';
export type TrackerEntry = { id: string; at: number; result: TrackerResult; trackerType?: TrackerType; note?: string };

/** A saved observation from a real Bluetooth scan, kept only when she chooses to. */
export type BleObservation = {
  id: string;
  at: number;
  deviceId?: string;
  name?: string;
  rssi?: number;
  serviceUuids?: string[];
  manufacturerName?: string;
  note?: string;
};

/* ---------- Digital Footprint Audit (replaces Quiet Check) ---------- */

export type AuditModuleId = 'social' | 'location' | 'contact' | 'photo';
/** Checklist states. "not_checked" is never treated as safe. */
export type AuditStatus = 'not_checked' | 'reviewed_ok' | 'exposure' | 'na';
export type AuditItemState = { status: AuditStatus; note?: string; at: number };
export type FindingSource = 'guided' | 'metadata' | 'manual';
export type AuditFinding = {
  id: string;
  module: AuditModuleId;
  itemId?: string;
  title: string;
  detail?: string;
  source: FindingSource;
  sourceUrl?: string;
  note?: string;
  at: number;
  updatedAt: number;
};
export type RemediationStatus = 'planned' | 'completed' | 'dismissed';
export type RemediationAction = {
  id: string;
  module?: AuditModuleId;
  findingId?: string;
  title: string;
  detail?: string;
  status: RemediationStatus;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
};

/** A snapshot copied into the Vault, so it survives even if its source is later deleted. */
type EvidenceBase = { id: string; savedAt: number; refId: string; eventAt: number; reviewNote?: string };
export type Evidence = EvidenceBase &
  (
    | { kind: 'bait'; baitName: string; baitType: BaitType; durationMs?: number }
    | { kind: 'link'; baitName: string; template: TemplateId; detail?: string }
    | { kind: 'tracker'; result: TrackerResult; trackerType?: TrackerType; note?: string }
    | { kind: 'account'; checkId: string; note?: string }
    | { kind: 'quiet'; area: QuietArea; note?: string }
    | { kind: 'audit'; module: AuditModuleId; title: string; note?: string }
    | { kind: 'ble'; name?: string; rssi?: number; note?: string }
  );

type Data = {
  version: 2;
  lang: Lang | null;
  /**
   * A random secret generated on this device, sent as a Bearer credential so the Bait Test
   * backend can scope tests to this device. This is NOT user authentication — it only prevents
   * one device reading another's tests; the server never trusts a client-supplied owner id.
   */
  ownerSecret: string;
  /** Show labelled sample records alongside real ones (for demos). Never mixed into storage. */
  showSample: boolean;
  baits: Bait[];
  baitEvents: BaitEvent[];
  emailBaits: EmailBait[];
  linkEvents: LinkEvent[];
  accountAnswers: Record<string, AccountAnswer>;
  /** Preserved from the old Quiet Check feature; no longer added to, but kept for continuity. */
  quietEntries: QuietEntry[];
  trackerEntries: TrackerEntry[];
  /** Digital Footprint Audit. Keyed by `${module}:${itemId}`. */
  auditItems: Record<string, AuditItemState>;
  auditFindings: AuditFinding[];
  remediation: RemediationAction[];
  evidence: Evidence[];
  planDone: Record<string, boolean>;
};

const KEY = 'nazar:data:v1';
/** 32 random bytes as hex. Used for the device-scoped owner secret. */
const genSecret = () => Array.from(Crypto.getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');

const EMPTY: Data = {
  version: 2,
  lang: null,
  ownerSecret: '',
  showSample: true,
  baits: [],
  baitEvents: [],
  emailBaits: [],
  linkEvents: [],
  accountAnswers: {},
  quietEntries: [],
  trackerEntries: [],
  auditItems: {},
  auditFindings: [],
  remediation: [],
  evidence: [],
  planDone: {},
};

export type LoadStatus = 'loading' | 'ready' | 'error';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Forward-compatible load. v1 saves had `wasMe` on decoy events and no audit fields; both are
 * handled by spreading over EMPTY (which adds the new audit arrays) without discarding any
 * existing user data, including Quiet Check entries and their saved evidence.
 */
function migrate(raw: Partial<Data>): Data {
  const d = { ...EMPTY, ...raw, version: 2 as const };
  if (!d.ownerSecret) d.ownerSecret = genSecret();
  const old = (raw.baitEvents ?? []) as (BaitEvent & { wasMe?: boolean })[];
  d.baitEvents = old.map(({ wasMe, ...e }) => (wasMe && !e.review ? { ...e, review: 'me' as const } : e));
  return d;
}

function useStoreValue() {
  const [data, setData] = useState<Data>(EMPTY);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [saveFailed, setSaveFailed] = useState(false);
  const loaded = useRef(false);

  const read = useCallback(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setData(migrate(JSON.parse(raw)));
        // First run: mint the device-scoped owner secret so it is stored once and reused.
        else setData((d) => ({ ...d, ownerSecret: d.ownerSecret || genSecret() }));
        loaded.current = true;
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);
  useEffect(read, [read]);
  const load = useCallback(() => {
    setStatus('loading');
    read();
  }, [read]);

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
      retryLoad: load,
      setLang: (lang: Lang) => update((d) => ({ ...d, lang })),
      setShowSample: (showSample: boolean) => update((d) => ({ ...d, showSample })),

      createBait: (name: string, type: BaitType) => {
        const bait: Bait = { id: uid(), name, type, createdAt: Date.now(), active: true };
        update((d) => ({ ...d, baits: [...d.baits, bait] }));
        return bait.id;
      },
      setBaitActive: (id: string, active: boolean) =>
        update((d) => ({
          ...d,
          baits: d.baits.map((b) => (b.id === id ? { ...b, active } : b)),
          emailBaits: d.emailBaits.map((b) => (b.id === id ? { ...b, active } : b)),
        })),
      deleteBait: (id: string) =>
        update((d) => ({
          ...d,
          baits: d.baits.filter((b) => b.id !== id),
          baitEvents: d.baitEvents.filter((e) => e.baitId !== id),
          emailBaits: d.emailBaits.filter((b) => b.id !== id),
          linkEvents: d.linkEvents.filter((e) => e.baitId !== id),
        })),
      /** Called by the calculator when a decoy is actually opened. */
      recordBaitOpen: (baitId: string) => {
        const id = uid();
        update((d) => ({ ...d, baitEvents: [...d.baitEvents, { id, baitId, at: Date.now() }] }));
        return id;
      },
      finishBaitOpen: (eventId: string, durationMs: number) =>
        update((d) => ({ ...d, baitEvents: d.baitEvents.map((e) => (e.id === eventId ? { ...e, durationMs } : e)) })),
      /** "Was this you?" for either kind of event. */
      reviewEvent: (eventId: string, review: EventReview | undefined) =>
        update((d) => ({
          ...d,
          baitEvents: d.baitEvents.map((e) => (e.id === eventId ? { ...e, review } : e)),
          linkEvents: d.linkEvents.map((e) => (e.id === eventId ? { ...e, review } : e)),
        })),

      createEmailBait: (name: string, template: TemplateId, recipient: string) => {
        const bait: EmailBait = { id: uid(), name, template, recipient, createdAt: Date.now(), active: true, send: { status: 'not_sent' } };
        update((d) => ({ ...d, emailBaits: [...d.emailBaits, bait] }));
        return bait.id;
      },
      setEmailSend: (id: string, send: EmailBait['send'], remoteId?: string) =>
        update((d) => ({ ...d, emailBaits: d.emailBaits.map((b) => (b.id === id ? { ...b, send, remoteId: remoteId ?? b.remoteId } : b)) })),
      /** Merge link events reported by the bait service, keeping her review answers. */
      mergeLinkEvents: (baitId: string, events: { id: string; at: number; detail?: string }[]) =>
        update((d) => {
          const known = new Map(d.linkEvents.map((e) => [e.id, e]));
          const fresh = events.filter((e) => !known.has(e.id)).map((e) => ({ ...e, baitId }));
          return fresh.length ? { ...d, linkEvents: [...d.linkEvents, ...fresh] } : d;
        }),

      answerAccountCheck: (checkId: string, status: AnswerStatus, note?: string) =>
        update((d) => ({ ...d, accountAnswers: { ...d.accountAnswers, [checkId]: { status, note, at: Date.now() } } })),

      /* Digital Footprint Audit */
      setAuditItem: (module: AuditModuleId, itemId: string, status: AuditStatus, note?: string) =>
        update((d) => ({ ...d, auditItems: { ...d.auditItems, [`${module}:${itemId}`]: { status, note, at: Date.now() } } })),
      addFinding: (f: Omit<AuditFinding, 'id' | 'at' | 'updatedAt'>) => {
        const id = uid();
        const now = Date.now();
        update((d) => ({ ...d, auditFindings: [...d.auditFindings, { ...f, id, at: now, updatedAt: now }] }));
        return id;
      },
      updateFinding: (id: string, patch: Partial<Pick<AuditFinding, 'title' | 'detail' | 'note' | 'sourceUrl'>>) =>
        update((d) => ({ ...d, auditFindings: d.auditFindings.map((f) => (f.id === id ? { ...f, ...patch, updatedAt: Date.now() } : f)) })),
      removeFinding: (id: string) =>
        update((d) => ({
          ...d,
          auditFindings: d.auditFindings.filter((f) => f.id !== id),
          remediation: d.remediation.map((r) => (r.findingId === id ? { ...r, findingId: undefined } : r)),
        })),
      addRemediation: (r: Omit<RemediationAction, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: RemediationStatus }) => {
        const id = uid();
        const now = Date.now();
        update((d) =>
          // Don't duplicate an identical suggested action for the same finding.
          d.remediation.some((x) => x.findingId === r.findingId && x.title === r.title)
            ? d
            : { ...d, remediation: [...d.remediation, { status: 'planned', ...r, id, createdAt: now, updatedAt: now }] },
        );
        return id;
      },
      setRemediationStatus: (id: string, status: RemediationStatus) =>
        update((d) => ({
          ...d,
          remediation: d.remediation.map((r) =>
            r.id === id ? { ...r, status, updatedAt: Date.now(), completedAt: status === 'completed' ? Date.now() : undefined } : r,
          ),
        })),
      removeRemediation: (id: string) => update((d) => ({ ...d, remediation: d.remediation.filter((r) => r.id !== id) })),

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
      setEvidenceNote: (id: string, reviewNote: string) =>
        update((d) => ({ ...d, evidence: d.evidence.map((e) => (e.id === id ? { ...e, reviewNote: reviewNote || undefined } : e)) })),
      removeEvidence: (id: string) => update((d) => ({ ...d, evidence: d.evidence.filter((e) => e.id !== id) })),

      togglePlanStep: (key: string) => update((d) => ({ ...d, planDone: { ...d.planDone, [key]: !d.planDone[key] } })),
    }),
    [update, load],
  );

  return { data, status, saveFailed, ...actions };
}

type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;
export type Store = ReturnType<typeof useStoreValue>;
export type StoreData = Data;

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

export function isToday(at: number, now = new Date()) {
  const d = new Date(at);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function latestQuiet<T extends QuietEntry>(entries: T[], area: QuietArea) {
  return entries.filter((e) => e.area === area).reduce<T | undefined>((m, e) => (!m || e.at > m.at ? e : m), undefined);
}

export function latestTracker<T extends TrackerEntry>(entries: T[]) {
  return entries.reduce<T | undefined>((m, e) => (!m || e.at > m.at ? e : m), undefined);
}
