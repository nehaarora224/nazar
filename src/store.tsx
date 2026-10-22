import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { getDevicePepper } from './crypto/deviceSecret';
import { EMPTY_GUARD, Guard, isLockedOut, lockRemaining, registerFailure, registerSuccess } from './crypto/lockout';
import { randomBytes } from './crypto/random';
import { createEnvelope, openEnvelope, rewrapPin, sealData, VaultCorruptError, VaultEnvelope, WrongPinError } from './crypto/vaultCrypto';
import { createReviewAccount, dropReviewAccount, NewReviewAccount, patchReviewAccounts, ReviewAccount, ReviewAccountPatch } from './reviewAccounts';

export type { ReviewAccount, ReviewAccountStatus, ReviewServiceId, NewReviewAccount, ReviewAccountPatch } from './reviewAccounts';

/**
 * Everything Nazar remembers lives here, persisted on this device only. Nothing in this
 * file is sample data: sample records for demos live in sample.ts and are never stored.
 *
 * At rest, the whole data blob is encrypted with AES-256-GCM under a key derived from the user's
 * PIN (see crypto/vaultCrypto.ts) and loaded only after unlock. Two things stay in plaintext so the
 * calculator disguise keeps working BEFORE unlock, and both are non-evidence by design:
 *   - the decoy definitions (DECOY_KEY): fake bait labels the user invents to catch a snoop; and
 *   - a small pending buffer (PENDING_KEY): decoy-open events captured while locked, which are
 *     folded into the encrypted vault (and wiped from plaintext) the next time the PIN is entered.
 * This plaintext-until-unlock window for just-captured events is the one documented gap; the fix is
 * public-key sealed captures (see the Phase C notes), which needs no new secret-at-rest.
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
    // A record the person added to the Vault by hand.
    | { kind: 'note'; title: string; category: ManualCategory; note?: string }
  );

/** Categories offered when adding a Vault record by hand. */
export type ManualCategory = 'incident' | 'bait' | 'tracker' | 'account' | 'audit' | 'other';

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
  /** User-added accounts to review (Google/Instagram/WhatsApp/email/custom). All user-entered. */
  reviewAccounts: ReviewAccount[];
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

/** Legacy pre-encryption store (plaintext). Read once, migrated into the encrypted vault, then deleted. */
const LEGACY_KEY = 'nazar:data:v1';
/** The encrypted vault envelope (useless without the PIN). */
const VAULT_KEY = 'nazar:vault:v1';
/** Non-secret retry state (failed-attempt count + lockout). Holds no PIN and no key. */
const GUARD_KEY = 'nazar:guard:v1';
/** Plaintext decoy definitions, so the calculator can show decoys before unlock. Fake labels, not evidence. */
const DECOY_KEY = 'nazar:decoys:v1';
/** Plaintext buffer of decoy-open events captured while locked; folded into the vault on unlock. */
const PENDING_KEY = 'nazar:pending:v1';

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
  reviewAccounts: [],
  quietEntries: [],
  trackerEntries: [],
  auditItems: {},
  auditFindings: [],
  remediation: [],
  evidence: [],
  planDone: {},
};

/**
 * loading: reading storage. setup: no vault yet — the user must create a PIN (any legacy data is
 * migrated then). locked: a vault exists but the PIN hasn't been entered this session. ready:
 * unlocked, data decrypted in memory. error: storage or vault failure.
 */
export type LoadStatus = 'loading' | 'setup' | 'locked' | 'ready' | 'error';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Forward-compatible load. v1 saves had `wasMe` on decoy events and no audit fields; both are
 * handled by spreading over EMPTY (which adds the new audit arrays) without discarding any
 * existing user data, including Quiet Check entries and their saved evidence. Pure (no crypto):
 * the owner secret is minted by the store, not here, so this stays trivially testable.
 */
function migrate(raw: Partial<Data>): Data {
  const d = { ...EMPTY, ...raw, version: 2 as const };
  const old = (raw.baitEvents ?? []) as (BaitEvent & { wasMe?: boolean })[];
  d.baitEvents = old.map(({ wasMe, ...e }) => (wasMe && !e.review ? { ...e, review: 'me' as const } : e));
  return d;
}

/** Ensure a device-scoped owner secret exists (minted once, kept inside the encrypted vault). */
function withSecret(d: Data): Data {
  return d.ownerSecret ? d : { ...d, ownerSecret: genSecret() };
}

/** Fold decoy-open events captured while locked into the data, skipping any already present. */
function foldPending(d: Data, pending: BaitEvent[]): Data {
  if (!pending.length) return d;
  const known = new Set(d.baitEvents.map((e) => e.id));
  const fresh = pending.filter((e) => !known.has(e.id));
  return fresh.length ? { ...d, baitEvents: [...d.baitEvents, ...fresh] } : d;
}

/** Outcome of a PIN unlock attempt, so the calculator can react without leaking which case occurred. */
export type UnlockResult = { ok: true } | { ok: false; reason: 'wrong_pin' | 'locked_out' | 'corrupt'; remainingMs?: number };

function useStoreValue() {
  const [data, setData] = useState<Data>(EMPTY);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [saveFailed, setSaveFailed] = useState(false);
  // Decoy labels readable while locked, so the calculator disguise keeps working before unlock.
  const [decoys, setDecoys] = useState<Bait[]>([]);

  const dekRef = useRef<Uint8Array | null>(null); // data-encryption key, held only while unlocked
  const envRef = useRef<VaultEnvelope | null>(null);
  const pepperRef = useRef<Uint8Array | null>(null);
  const guardRef = useRef<Guard>(EMPTY_GUARD);
  const legacyRef = useRef<Data | null>(null); // migrated plaintext awaiting encryption on PIN creation
  const pendingRef = useRef<BaitEvent[]>([]); // decoy opens captured while locked
  const canPersist = useRef(false); // true only once unlocked — guards against writing EMPTY over the vault

  // Load from storage into state on mount. Promise-chain form so every setState sits inside a
  // callback (reacting to the external store resolving), never synchronously in the effect body.
  const boot = useCallback(() => {
    getDevicePepper()
      .then((pepper) => {
        pepperRef.current = pepper;
        return Promise.all([
          AsyncStorage.getItem(GUARD_KEY),
          AsyncStorage.getItem(DECOY_KEY),
          AsyncStorage.getItem(PENDING_KEY),
          AsyncStorage.getItem(VAULT_KEY),
          AsyncStorage.getItem(LEGACY_KEY),
        ]);
      })
      .then(([guardRaw, decoyRaw, pendingRaw, vaultRaw, legacyRaw]) => {
        guardRef.current = guardRaw ? (JSON.parse(guardRaw) as Guard) : { ...EMPTY_GUARD };
        pendingRef.current = pendingRaw ? (JSON.parse(pendingRaw) as BaitEvent[]) : [];
        const decoyIndex = decoyRaw ? (JSON.parse(decoyRaw) as Bait[]) : [];
        if (vaultRaw) {
          envRef.current = JSON.parse(vaultRaw) as VaultEnvelope;
          setDecoys(decoyIndex);
          setStatus('locked');
        } else {
          // No vault yet: migrate any legacy plaintext so it can be encrypted once a PIN is set.
          legacyRef.current = legacyRaw ? withSecret(migrate(JSON.parse(legacyRaw))) : null;
          setDecoys(legacyRef.current?.baits ?? decoyIndex);
          setStatus('setup');
        }
      })
      .catch(() => setStatus('error'));
  }, []);
  useEffect(boot, [boot]);
  const retryLoad = useCallback(() => {
    setStatus('loading');
    boot();
  }, [boot]);

  const persistGuard = useCallback((g: Guard) => {
    guardRef.current = g;
    AsyncStorage.setItem(GUARD_KEY, JSON.stringify(g)).catch(() => {});
  }, []);

  const writeDecoys = useCallback((baits: Bait[]) => {
    setDecoys(baits);
    AsyncStorage.setItem(DECOY_KEY, JSON.stringify(baits)).catch(() => {});
  }, []);

  // Encrypted write-through. Runs only after unlock/create (canPersist) and never with the empty
  // defaults; re-seals the blob under the in-memory DEK (fast — no KDF) and mirrors decoy labels.
  useEffect(() => {
    if (!canPersist.current || !dekRef.current || !envRef.current || status !== 'ready') return;
    const env = sealData(dekRef.current, JSON.stringify(data), envRef.current, randomBytes);
    envRef.current = env;
    AsyncStorage.setItem(VAULT_KEY, JSON.stringify(env))
      .then(() => setSaveFailed(false))
      .catch(() => setSaveFailed(true));
    writeDecoys(data.baits);
  }, [data, status, writeDecoys]);

  const update = useCallback((fn: (d: Data) => Data) => setData(fn), []);

  // Finish a successful unlock/create: fold locked-capture events, wipe the plaintext buffer, go ready.
  const finishUnlock = useCallback((d: Data) => {
    const merged = foldPending(d, pendingRef.current);
    pendingRef.current = [];
    AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
    canPersist.current = true;
    setData(merged);
    setStatus('ready');
  }, []);

  /** First run: create the PIN, encrypt the (migrated) data under it, and open the vault. */
  const createPin = useCallback(
    async (pin: string): Promise<UnlockResult> => {
      try {
        const base = withSecret(foldPending(legacyRef.current ?? EMPTY, pendingRef.current));
        await new Promise((r) => setTimeout(r, 0)); // let the UI paint before the brief scrypt
        const env = createEnvelope(pin, JSON.stringify(base), randomBytes, pepperRef.current);
        envRef.current = env;
        dekRef.current = openEnvelope(pin, env, pepperRef.current).dek;
        await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(env));
        await AsyncStorage.multiRemove([LEGACY_KEY, PENDING_KEY]);
        legacyRef.current = null;
        pendingRef.current = [];
        persistGuard(registerSuccess());
        canPersist.current = true;
        writeDecoys(base.baits);
        setData(base);
        setStatus('ready');
        return { ok: true };
      } catch {
        return { ok: false, reason: 'corrupt' };
      }
    },
    [persistGuard, writeDecoys],
  );

  /** Unlock with the PIN. Enforces lockout, counts failures, and never reveals which digit was wrong. */
  const unlock = useCallback(
    async (pin: string): Promise<UnlockResult> => {
      const now = Date.now();
      if (isLockedOut(guardRef.current, now)) return { ok: false, reason: 'locked_out', remainingMs: lockRemaining(guardRef.current, now) };
      const env = envRef.current;
      if (!env) return { ok: false, reason: 'corrupt' };
      await new Promise((r) => setTimeout(r, 0));
      try {
        const { dek, plaintext } = openEnvelope(pin, env, pepperRef.current);
        dekRef.current = dek;
        persistGuard(registerSuccess());
        finishUnlock(withSecret(migrate(JSON.parse(plaintext))));
        return { ok: true };
      } catch (e) {
        if (e instanceof WrongPinError) {
          const g = registerFailure(guardRef.current, Date.now());
          persistGuard(g);
          return { ok: false, reason: 'wrong_pin', remainingMs: lockRemaining(g, Date.now()) };
        }
        if (e instanceof VaultCorruptError) setStatus('error');
        return { ok: false, reason: 'corrupt' };
      }
    },
    [persistGuard, finishUnlock],
  );

  /**
   * Clear the key and decrypted data from memory. Called when returning to the calculator
   * (Exit/background). Depends only on refs so its identity is STABLE — a changing identity would
   * re-fire the calculator's focus effect and wrongly re-lock right after an unlock.
   */
  const lock = useCallback(() => {
    if (!canPersist.current) return; // nothing unlocked to clear
    canPersist.current = false; // set first (sync) so the save effect can't write EMPTY over the vault
    dekRef.current = null;
    setData(EMPTY);
    setStatus(envRef.current ? 'locked' : 'setup');
  }, []);

  /** Change the PIN by re-wrapping the same DEK (data is not re-encrypted). */
  const changePin = useCallback(async (oldPin: string, newPin: string): Promise<UnlockResult> => {
    const env = envRef.current;
    if (!env) return { ok: false, reason: 'corrupt' };
    await new Promise((r) => setTimeout(r, 0));
    try {
      const next = rewrapPin(oldPin, newPin, env, randomBytes, pepperRef.current);
      envRef.current = next;
      await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(next));
      return { ok: true };
    } catch (e) {
      if (e instanceof WrongPinError) return { ok: false, reason: 'wrong_pin' };
      return { ok: false, reason: 'corrupt' };
    }
  }, []);

  /** Milliseconds of unlock lockout remaining (0 if unlock is allowed now). */
  const pinLockoutRemaining = useCallback(() => lockRemaining(guardRef.current, Date.now()), []);

  const actions = useMemo(
    () => ({
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
      /**
       * Called by the calculator when a decoy is actually opened. While unlocked it goes straight
       * into the encrypted vault; while LOCKED it is buffered in the plaintext pending store and
       * folded into the vault on the next unlock (see the note at the top of this file).
       */
      recordBaitOpen: (baitId: string) => {
        const id = uid();
        const ev: BaitEvent = { id, baitId, at: Date.now() };
        if (canPersist.current) update((d) => ({ ...d, baitEvents: [...d.baitEvents, ev] }));
        else {
          pendingRef.current = [...pendingRef.current, ev];
          AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pendingRef.current)).catch(() => {});
        }
        return id;
      },
      finishBaitOpen: (eventId: string, durationMs: number) => {
        if (canPersist.current) update((d) => ({ ...d, baitEvents: d.baitEvents.map((e) => (e.id === eventId ? { ...e, durationMs } : e)) }));
        else {
          pendingRef.current = pendingRef.current.map((e) => (e.id === eventId ? { ...e, durationMs } : e));
          AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pendingRef.current)).catch(() => {});
        }
      },
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

      /* User-added accounts to review (all user-entered; Nazar never signs in or reads sessions). */
      addReviewAccount: (input: NewReviewAccount) => {
        const id = uid();
        update((d) => ({ ...d, reviewAccounts: [...d.reviewAccounts, createReviewAccount(input, id, Date.now())] }));
        return id;
      },
      updateReviewAccount: (id: string, patch: ReviewAccountPatch) =>
        update((d) => ({ ...d, reviewAccounts: patchReviewAccounts(d.reviewAccounts, id, patch, Date.now()) })),
      removeReviewAccount: (id: string) => update((d) => ({ ...d, reviewAccounts: dropReviewAccount(d.reviewAccounts, id) })),

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
    [update],
  );

  return { data, status, saveFailed, decoys, retryLoad, createPin, unlock, lock, changePin, pinLockoutRemaining, ...actions };
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
