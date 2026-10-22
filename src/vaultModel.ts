import type { TKey } from './i18n/en';
import type { Evidence, StoreData } from './store';

/**
 * Builds the Vault timeline: real SAVED records plus AUTO-COLLECTED items derived from events Nazar
 * actually recorded (bait/decoy opens, bait sends, bait creation). Pure — no React/storage/i18n at
 * runtime (TKey is a type) — so collection, de-duplication, filtering and classification are tested
 * directly. Auto items are NOT copies in storage: they reflect their source events, so they can't be
 * fabricated or drift from the original, and they survive restarts because their source does.
 *
 * The transparent, rule-based classifier lives here too (kept self-contained so it is unit-testable
 * with no runtime cross-imports, like the other pure modules). No AI and no network: it reads the
 * metadata Nazar already has — what kind of event, whether it was technically verified, the chosen
 * category, and the person's own words — and SUGGESTS a severity + relevance with explainable
 * reasons. Hard rules kept honest:
 *  - "relevance" separates a CONFIRMED technical event (the backend/device actually reported it)
 *    from a user-REPORTED incident and from an UNVERIFIED suspicion. A keyword never makes
 *    something "confirmed".
 *  - keywords in the person's wording may only NUDGE the suggested severity up by one step, and
 *    that is always labelled as coming from their wording — never treated as proof of surveillance.
 *  - the person can override the suggestion (see the Vault add/edit screens).
 */

export type Severity = 'info' | 'low' | 'medium' | 'high';
export const SEVERITY_ORDER: Severity[] = ['info', 'low', 'medium', 'high'];
export type Relevance = 'confirmed' | 'reported' | 'unverified';

/** What produced the evidence. */
export type EvidenceGroup = 'bait_catch' | 'decoy_catch' | 'bait_sent' | 'bait_created' | 'permaudit' | 'footprint' | 'manual' | 'intruder';

export type ClassifyInput = {
  group: EvidenceGroup;
  /** Did the backend or the device actually verify this event happened? */
  confirmed: boolean;
  /** Manual category, when group === 'manual'. */
  category?: string;
  /** "Was this you?" answer for a bait/decoy catch. */
  review?: 'me' | 'notMe' | 'unsure';
  /** Title + description + notes, used only for the optional wording-based nudge. */
  text?: string;
  /** e.g. a permission audit that found nothing worth reviewing. */
  nothingFound?: boolean;
};

export type Classification = { severity: Severity; relevance: Relevance; reasons: TKey[]; keywordBump: boolean };

const clamp = (i: number) => Math.max(0, Math.min(SEVERITY_ORDER.length - 1, i));
const sev = (i: number): Severity => SEVERITY_ORDER[clamp(i)];
const idx = (s: Severity) => SEVERITY_ORDER.indexOf(s);

/**
 * Wording that may raise the SUGGESTED severity by one step. This is a heuristic on the person's
 * own words — never a detection and never proof. English terms only; other languages simply get no
 * nudge (the base rules still apply). Kept small and inspectable on purpose.
 */
const CONCERN_WORDS = [
  'follow',
  'following',
  'followed',
  'stalk',
  'threat',
  'threaten',
  'camera',
  'recording',
  'recorded',
  'hack',
  'hacked',
  'break in',
  'broke in',
  'afraid',
  'scared',
  'unsafe',
  'weapon',
];

function hasConcernWord(text?: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return CONCERN_WORDS.some((w) => t.includes(w));
}

const MANUAL_BASE: Record<string, Severity> = {
  suspicious_login: 'medium',
  unfamiliar_device: 'medium',
  message_email: 'medium',
  location_exposure: 'medium',
  tracker_concern: 'medium',
  other: 'low',
  // legacy categories
  incident: 'low',
  bait: 'low',
  tracker: 'medium',
  account: 'medium',
  audit: 'low',
};

export function classify(input: ClassifyInput): Classification {
  const reasons: TKey[] = [];

  // 1) Relevance — confirmed vs reported vs unverified.
  let relevance: Relevance;
  if (input.group === 'manual') {
    relevance = 'reported';
    reasons.push('ec.r.reported');
  } else if (input.group === 'footprint') {
    relevance = 'reported';
    reasons.push('ec.r.footprint');
  } else if (input.group === 'bait_created' || input.nothingFound || !input.confirmed) {
    relevance = 'unverified';
    reasons.push(input.nothingFound ? 'ec.r.nothing' : input.group === 'bait_created' ? 'ec.r.created' : 'ec.r.unconfirmed');
  } else {
    relevance = 'confirmed';
    reasons.push('ec.r.confirmed');
  }

  // 2) Base severity.
  let base: Severity;
  if (input.group === 'bait_catch' || input.group === 'decoy_catch') {
    base = input.review === 'notMe' ? 'high' : input.review === 'me' ? 'info' : 'medium';
    reasons.push(input.review === 'notMe' ? 'ec.s.notMe' : input.review === 'me' ? 'ec.s.me' : 'ec.s.catch');
  } else if (input.group === 'bait_sent') {
    base = 'low';
    reasons.push('ec.s.sent');
  } else if (input.group === 'bait_created') {
    base = 'info';
    reasons.push('ec.s.created');
  } else if (input.group === 'permaudit') {
    base = input.nothingFound ? 'info' : 'low';
    reasons.push(input.nothingFound ? 'ec.s.permNone' : 'ec.s.perm');
  } else if (input.group === 'footprint') {
    base = 'low';
    reasons.push('ec.s.footprint');
  } else if (input.group === 'intruder') {
    base = 'high';
    reasons.push('ec.s.intruder');
  } else {
    base = MANUAL_BASE[input.category ?? 'other'] ?? 'low';
    reasons.push('ec.s.category');
  }

  // 3) Optional wording nudge (never changes relevance, never implies proof).
  let level = idx(base);
  const keywordBump = relevance !== 'unverified' && hasConcernWord(input.text);
  if (keywordBump) {
    level += 1;
    reasons.push('ec.s.wording');
  }

  // 4) Relevance cap: an unverified suspicion can't be high; a reported incident can't exceed high.
  if (relevance === 'unverified') {
    const capped = Math.min(level, idx('low'));
    if (capped < level) reasons.push('ec.s.capUnverified');
    level = capped;
  }

  return { severity: sev(level), relevance, reasons, keywordBump };
}

export type VaultOrigin = 'auto' | 'manual';
export type VaultFilter = 'all' | Relevance;

export type VaultItem = {
  key: string;
  origin: VaultOrigin;
  /** Auto items use an i18n title key; manual items carry the person's own title string. */
  titleKey?: TKey;
  title: string;
  subtitle?: string;
  sourceKey: TKey;
  sourceKind: Evidence['kind'] | 'auto';
  catKey?: TKey;
  at: number;
  savedAt?: number;
  severity: Severity;
  relevance: Relevance;
  reasons: TKey[];
  /** Set for saved records → opens the Vault detail. */
  evidenceId?: string;
  /** Set for auto items → opens the source screen. */
  href?: string;
  hrefParams?: Record<string, string>;
  /** The source event id, used only to de-duplicate an auto item against a saved copy. */
  sourceEventId?: string;
  /** Lowercase, user-entered strings only (names, titles, notes) for search. */
  text: string;
};

const lc = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' ').toLowerCase();

/** The classification input for a saved evidence record. Saved bait/decoy catches were saved
 * because they were flagged "not me", so they classify as confirmed catches. */
function manualInput(e: Evidence): Parameters<typeof classify>[0] {
  const common = lc('note' in e ? e.note : undefined, 'reviewNote' in e ? e.reviewNote : undefined);
  switch (e.kind) {
    case 'link':
      return { group: 'bait_catch', confirmed: true, review: 'notMe', text: lc(e.baitName, common) };
    case 'bait':
      return { group: 'decoy_catch', confirmed: true, review: 'notMe', text: lc(e.baitName, common) };
    case 'permaudit':
      return { group: 'permaudit', confirmed: true, text: lc(e.title, e.summary, common) };
    case 'audit':
      return { group: 'footprint', confirmed: false, text: lc(e.title, common) };
    case 'note':
      return { group: 'manual', confirmed: false, category: e.category, text: lc(e.title, e.description, e.discovery, common) };
    case 'tracker':
      return { group: 'manual', confirmed: false, category: 'tracker_concern', text: common };
    case 'ble':
      return { group: 'manual', confirmed: false, category: 'tracker_concern', text: lc(e.name, common) };
    case 'account':
      return { group: 'manual', confirmed: false, category: 'suspicious_login', text: common };
    case 'quiet':
      return { group: 'manual', confirmed: false, category: 'other', text: common };
  }
}

export function manualItem(e: Evidence): VaultItem {
  const c = classify(manualInput(e));
  // The person's own severity override wins over the suggestion (only 'note' records can set one).
  const severity = e.kind === 'note' && e.severity ? e.severity : c.severity;
  return {
    key: `ev:${e.id}`,
    origin: 'manual',
    title: 'title' in e ? e.title : '',
    titleKey: 'title' in e ? undefined : undefined,
    subtitle: 'baitName' in e ? e.baitName : 'name' in e ? e.name : undefined,
    sourceKey: `vault.source.${e.kind}` as TKey,
    sourceKind: e.kind,
    catKey: e.kind === 'note' ? (`vault.cat.${e.category}` as TKey) : undefined,
    at: e.eventAt,
    savedAt: e.savedAt,
    severity,
    relevance: c.relevance,
    reasons: c.reasons,
    evidenceId: e.id,
    text: manualInput(e).text ?? '',
  };
}

/** Derive auto-collected items from the real recorded events. */
export function autoItems(data: StoreData): VaultItem[] {
  const names = new Map<string, string>();
  for (const b of data.emailBaits) names.set(b.id, b.name);
  for (const b of data.baits) names.set(b.id, b.name);

  const out: VaultItem[] = [];

  // Confirmed catches — the genuine evidence.
  for (const e of data.linkEvents) {
    const name = names.get(e.baitId);
    const c = classify({ group: 'bait_catch', confirmed: true, review: e.review, text: lc(name) });
    out.push({
      key: `auto-link:${e.id}`,
      origin: 'auto',
      titleKey: 'vault.auto.linkOpen',
      title: '',
      subtitle: name,
      sourceKey: 'vault.source.link',
      sourceKind: 'auto',
      at: e.at,
      severity: c.severity,
      relevance: c.relevance,
      reasons: c.reasons,
      href: '/bait-detail',
      hrefParams: { id: e.baitId },
      sourceEventId: e.id,
      text: lc(name),
    });
  }
  for (const e of data.baitEvents) {
    const name = names.get(e.baitId);
    const c = classify({ group: 'decoy_catch', confirmed: true, review: e.review, text: lc(name) });
    out.push({
      key: `auto-decoy:${e.id}`,
      origin: 'auto',
      titleKey: 'vault.auto.decoyOpen',
      title: '',
      subtitle: name,
      sourceKey: 'vault.source.bait',
      sourceKind: 'auto',
      at: e.at,
      severity: c.severity,
      relevance: c.relevance,
      reasons: c.reasons,
      href: '/bait-detail',
      hrefParams: { id: e.baitId },
      sourceEventId: e.id,
      text: lc(name),
    });
  }
  // Setup actions — low/info, filterable away.
  for (const b of data.emailBaits) {
    if (b.send.status === 'sent' && b.send.at) {
      const c = classify({ group: 'bait_sent', confirmed: true, text: lc(b.name) });
      out.push(auto(`auto-sent:${b.id}`, 'vault.auto.sent', b.name, 'vault.source.link', b.send.at, c, b.id));
    }
    const cc = classify({ group: 'bait_created', confirmed: false, text: lc(b.name) });
    out.push(auto(`auto-created:${b.id}`, 'vault.auto.created', b.name, 'vault.source.link', b.createdAt, cc, b.id));
  }
  for (const b of data.baits) {
    const cc = classify({ group: 'bait_created', confirmed: false, text: lc(b.name) });
    out.push(auto(`auto-created:${b.id}`, 'vault.auto.created', b.name, 'vault.source.bait', b.createdAt, cc, b.id));
  }

  // Intruder captures — a real photo was taken after repeated wrong-PIN attempts. Confirmed, high.
  for (const c of data.intruderCaptures ?? []) {
    const cc = classify({ group: 'intruder', confirmed: true, text: '' });
    out.push({
      key: `auto-intruder:${c.id}`,
      origin: 'auto',
      titleKey: 'vault.auto.intruder',
      title: '',
      sourceKey: 'vault.source.intruder',
      sourceKind: 'auto',
      at: c.at,
      severity: cc.severity,
      relevance: cc.relevance,
      reasons: cc.reasons,
      href: '/intruder',
      sourceEventId: c.id,
      text: '',
    });
  }
  return out;
}

function auto(
  key: string,
  titleKey: TKey,
  name: string | undefined,
  sourceKey: TKey,
  at: number,
  c: ReturnType<typeof classify>,
  baitId: string,
): VaultItem {
  return {
    key,
    origin: 'auto',
    titleKey,
    title: '',
    subtitle: name,
    sourceKey,
    sourceKind: 'auto',
    at,
    severity: c.severity,
    relevance: c.relevance,
    reasons: c.reasons,
    href: '/bait-detail',
    hrefParams: { id: baitId },
    text: lc(name),
  };
}

/** Merge saved + auto, drop auto items the person has already saved (no duplicates), newest first. */
export function buildVault(data: StoreData): VaultItem[] {
  const manual = data.evidence.map(manualItem);
  const savedEventRefs = new Set(data.evidence.filter((e) => e.kind === 'link' || e.kind === 'bait').map((e) => e.refId));
  const auto = autoItems(data).filter((a) => !(a.sourceEventId && savedEventRefs.has(a.sourceEventId)));
  return [...manual, ...auto].sort((x, y) => y.at - x.at);
}

/** Text search + relevance filter. Pure. */
export function searchVault(items: VaultItem[], query: string, filter: VaultFilter): VaultItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((it) => (filter === 'all' || it.relevance === filter) && (!q || it.text.includes(q)));
}

export const SEVERITY_TONE: Record<Severity, 'off' | 'look' | 'act' | 'safe'> = {
  info: 'off',
  low: 'off',
  medium: 'look',
  high: 'act',
};
