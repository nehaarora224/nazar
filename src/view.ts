import { useMemo } from 'react';

import { ACCOUNT_CHECKS, checkKey } from './content/accountChecks';
import { ALL_AUDIT_ITEMS, AUDIT_MODULES } from './content/audit';
import type { TKey } from './i18n/en';
import { buildSample, SampleData, Sampled } from './sample';
import {
  AuditFinding,
  AuditItemState,
  AuditModuleId,
  AuditStatus,
  BaitType,
  EmailBait,
  EventReview,
  Evidence,
  isToday,
  latestQuiet,
  latestTracker,
  QuietArea,
  QuietEntry,
  RemediationAction,
  StoreData,
  TemplateId,
  TrackerEntry,
  TrackerResult,
  useStore,
} from './store';
import type { Tone } from './theme';

/*
 * One read-only view over real records plus (when switched on) labelled sample records.
 * Screens read from here; writes go to the store, and sample items are never writable.
 */

export type BaitView = Sampled & {
  id: string;
  kind: 'decoy' | 'email';
  name: string;
  createdAt: number;
  active: boolean;
  decoyType?: BaitType;
  template?: TemplateId;
  recipient?: string;
  send?: EmailBait['send'];
};
export type EventView = Sampled & {
  id: string;
  baitId: string;
  kind: 'decoy' | 'link';
  at: number;
  durationMs?: number;
  detail?: string;
  review?: EventReview;
};
export type EvidenceView = Evidence & Sampled;
export type PendingView = Sampled & { id: string; kind: Evidence['kind']; title: string; titleKey?: TKey; at: number; href: string; params?: Record<string, string> };
export type CheckState = { tone: Tone; key: TKey; params?: Record<string, string | number>; sample?: boolean; clear: boolean; review: boolean };

export const TRACKER_TONE: Record<TrackerResult, Tone> = { tracker: 'act', unknown: 'look', incomplete: 'look', none: 'safe' };
export const QUIET_AREAS: QuietArea[] = ['mic', 'camera', 'location'];
/** An event that may be someone else: not marked as hers. */
export const counts = (e: EventView) => e.review !== 'me';

export function buildView(data: StoreData, sample: SampleData | null) {
  const baits: BaitView[] = [
    ...data.emailBaits.map((b) => ({ id: b.id, kind: 'email' as const, name: b.name, createdAt: b.createdAt, active: b.active, template: b.template, recipient: b.recipient, send: b.send })),
    ...data.baits.map((b) => ({ id: b.id, kind: 'decoy' as const, name: b.name, createdAt: b.createdAt, active: b.active, decoyType: b.type })),
    ...(sample?.emailBaits ?? []).map((b) => ({ id: b.id, kind: 'email' as const, name: b.name, createdAt: b.createdAt, active: b.active, template: b.template, recipient: b.recipient, send: b.send, sample: true as const })),
  ];
  const events: EventView[] = [
    ...data.baitEvents.map((e) => ({ ...e, kind: 'decoy' as const })),
    ...data.linkEvents.map((e) => ({ ...e, kind: 'link' as const })),
    ...(sample?.linkEvents ?? []).map((e) => ({ ...e, kind: 'link' as const })),
  ].filter((e) => baits.some((b) => b.id === e.baitId));

  const quietEntries: (QuietEntry & Sampled)[] = [...data.quietEntries, ...(sample?.quietEntries ?? [])];
  const trackerEntries: (TrackerEntry & Sampled)[] = [...data.trackerEntries, ...(sample?.trackerEntries ?? [])];
  // Audit: her own records win over any sample with the same key.
  const auditItems: Record<string, AuditItemState & Sampled> = { ...(sample?.auditItems ?? {}), ...data.auditItems };
  const auditFindings: (AuditFinding & Sampled)[] = [...data.auditFindings, ...(sample?.auditFindings ?? [])];
  const remediation: (RemediationAction & Sampled)[] = [...data.remediation, ...(sample?.remediation ?? [])];
  const evidence: EvidenceView[] = [...data.evidence, ...(sample?.evidence ?? [])];
  const isSaved = (kind: Evidence['kind'], refId: string) => evidence.some((e) => e.kind === kind && e.refId === refId);
  const baitOf = (id: string) => baits.find((b) => b.id === id);

  // Pending review: things that may matter but haven't been dealt with yet.
  const pending: PendingView[] = [
    ...events
      .filter((e) => !e.sample && e.review !== 'me' && !isSaved(e.kind === 'link' ? 'link' : 'bait', e.id))
      .map((e) => ({ id: `p-${e.id}`, kind: e.kind === 'link' ? ('link' as const) : ('bait' as const), title: baitOf(e.baitId)?.name ?? '', at: e.at, href: '/bait-detail', params: { id: e.baitId } })),
    ...ACCOUNT_CHECKS.filter((c) => data.accountAnswers[c.id]?.status === 'review' && !isSaved('account', c.id)).map((c) => ({
      id: `p-${c.id}`,
      kind: 'account' as const,
      title: '',
      titleKey: checkKey(c.id, 'title'),
      at: data.accountAnswers[c.id].at,
      href: '/account-item',
      params: { id: c.id },
    })),
    ...data.quietEntries
      .filter((q) => q.status === 'review' && !isSaved('quiet', q.id))
      .map((q) => ({ id: `p-${q.id}`, kind: 'quiet' as const, title: q.note ?? '', titleKey: `quiet.${q.area}` as TKey, at: q.at, href: '/digital-footprint-audit' })),
    ...data.trackerEntries
      .filter((t) => (t.result === 'tracker' || t.result === 'unknown') && !isSaved('tracker', t.id))
      .map((t) => ({ id: `p-${t.id}`, kind: 'tracker' as const, title: '', titleKey: `trk.cls.${t.result}` as TKey, at: t.at, href: '/tracker-detail', params: { id: t.id } })),
    ...(sample?.pending ?? []).map((p) => ({
      id: p.id,
      kind: p.kind,
      title: p.title,
      at: p.at,
      href: p.source === 'bait' ? '/bait-detail' : '/session',
      params: { id: p.ref },
      sample: true as const,
    })),
  ];

  return {
    showSample: !!sample,
    sample,
    baits,
    events,
    quietEntries,
    trackerEntries,
    evidence,
    pending,
    auditItems,
    auditFindings,
    remediation,
    accounts: sample?.accounts ?? [],
    sessions: sample?.sessions ?? [],
    sharing: sample?.sharing ?? [],
    /** Real ticks once she has ticked anything; sample progress before that. */
    plan: Object.values(data.planDone).some(Boolean) || !sample ? { done: data.planDone, sample: false } : { done: sample.planDone, sample: true },
    isSaved,
    baitOf,
  };
}

export type View = ReturnType<typeof buildView>;

export function useView() {
  const { data } = useStore();
  // Demo/seed data is shown alongside real records so the app isn't empty on first run. Every
  // sample item is labelled in the UI (a "Sample" badge and a banner), is never written to
  // storage, is excluded from the downloadable export, and can be hidden from the banner.
  const sample = useMemo(() => (data.showSample ? buildSample() : null), [data.showSample]);
  return useMemo(() => buildView(data, sample), [data, sample]);
}

/* ---------- Summaries ---------- */

/** Live means it can actually catch something: a decoy that's on, or an email bait that was really sent. */
export const isLive = (b: BaitView) => b.active && (b.kind === 'decoy' || b.send?.status === 'sent');

export function baitSummary(v: View) {
  const active = v.baits.filter(isLive);
  const counted = v.events.filter(counts);
  const today = counted.filter((e) => isToday(e.at));
  const latest = counted.reduce<EventView | undefined>((m, e) => (!m || e.at > m.at ? e : m), undefined);
  const unreviewed = v.events.filter((e) => !e.review || e.review === 'unsure');
  return { active, today, latest, unreviewed };
}

/** Accounts check, from her guided answers, or from sample accounts when she has none. */
export function accountState(data: StoreData, v: View): CheckState {
  const answers = ACCOUNT_CHECKS.map((c) => data.accountAnswers[c.id]);
  const done = answers.filter((a) => a && a.status !== 'skipped').length;
  const review = answers.filter((a) => a?.status === 'review').length;
  if (answers.some(Boolean)) {
    if (review) return { tone: 'look', key: review === 1 ? 'acctCard.review_one' : 'acctCard.review_other', params: { n: review }, clear: false, review: true };
    if (done === ACCOUNT_CHECKS.length) return { tone: 'safe', key: 'acctCard.clear', clear: true, review: false };
    return { tone: 'off', key: 'acctCard.progress', params: { done, total: ACCOUNT_CHECKS.length }, clear: false, review: false };
  }
  const unfamiliar = v.sessions.filter((s) => s.status === 'unfamiliar').length;
  if (v.showSample && unfamiliar)
    return { tone: 'look', key: unfamiliar === 1 ? 'acctCard.signin_one' : 'acctCard.signin_other', params: { n: unfamiliar }, sample: true, clear: false, review: true };
  return { tone: 'off', key: 'acctCard.none', clear: false, review: false };
}

export function quietState(data: StoreData, v: View): CheckState & { lastAt: number } {
  const pick = (entries: QuietEntry[]) => QUIET_AREAS.map((a) => latestQuiet(entries, a));
  const real = pick(data.quietEntries);
  const useSample = !real.some(Boolean) && v.showSample && v.sample;
  const latest = useSample ? pick(v.sample!.quietEntries) : real;
  const done = latest.filter(Boolean).length;
  const review = latest.filter((e) => e?.status === 'review').length;
  const lastAt = latest.reduce((m, e) => Math.max(m, e?.at ?? 0), 0);
  const sample = !!useSample || undefined;
  if (done === 0) return { tone: 'off', key: 'quietCard.none', clear: false, review: false, lastAt };
  if (review) return { tone: 'look', key: review === 1 ? 'quietCard.review_one' : 'quietCard.review_other', params: { n: review }, sample, clear: false, review: true, lastAt };
  if (done < 3) return { tone: 'off', key: 'quietCard.progress', params: { done }, sample, clear: false, review: false, lastAt };
  return { tone: 'safe', key: 'quietCard.doneShort', sample, clear: true, review: false, lastAt };
}

/* ---------- Digital Footprint Audit ---------- */

export const AUDIT_MODULE_IDS: AuditModuleId[] = AUDIT_MODULES.map((m) => m.id);
export const auditItemState = (v: View, module: AuditModuleId, item: string): (AuditItemState & Sampled) | undefined =>
  v.auditItems[`${module}:${item}`];

export function auditModuleSummary(v: View, module: AuditModuleId) {
  const items = ALL_AUDIT_ITEMS.filter((i) => i.module === module);
  const states = items.map((i) => auditItemState(v, module, i.item));
  const counted: Record<AuditStatus, number> = { not_checked: 0, reviewed_ok: 0, exposure: 0, na: 0 };
  for (const s of states) counted[s?.status ?? 'not_checked']++;
  const checked = items.length - counted.not_checked;
  const openFindings = v.auditFindings.filter((f) => f.module === module).length;
  const sample = states.some((s) => s?.sample) || v.auditFindings.some((f) => f.module === module && f.sample);
  return { total: items.length, checked, exposure: counted.exposure, openFindings, sample };
}

export function auditOverall(v: View) {
  const per = AUDIT_MODULE_IDS.map((m) => auditModuleSummary(v, m));
  const total = per.reduce((n, s) => n + s.total, 0);
  const checked = per.reduce((n, s) => n + s.checked, 0);
  const exposure = per.reduce((n, s) => n + s.exposure, 0);
  const findings = v.auditFindings.length;
  const sample = per.some((s) => s.sample);
  return { total, checked, exposure, findings, sample };
}

export function remediationSummary(v: View) {
  const planned = v.remediation.filter((r) => r.status === 'planned').length;
  const completed = v.remediation.filter((r) => r.status === 'completed').length;
  const dismissed = v.remediation.filter((r) => r.status === 'dismissed').length;
  return { planned, completed, dismissed, total: v.remediation.length };
}

/** Home card state for the audit. */
export function auditState(data: StoreData, v: View): CheckState {
  const o = auditOverall(v);
  const sampleOnly = o.sample && o.checked === auditOverall(buildView(data, null)).checked;
  if (o.checked === 0) return { tone: 'off', key: 'afCard.none', clear: false, review: false };
  if (o.findings > 0)
    return { tone: 'look', key: o.findings === 1 ? 'afCard.findings_one' : 'afCard.findings_other', params: { n: o.findings }, sample: sampleOnly || undefined, clear: false, review: true };
  if (o.checked < o.total)
    return { tone: 'off', key: 'afCard.progress', params: { done: o.checked, total: o.total }, sample: sampleOnly || undefined, clear: false, review: false };
  return { tone: 'safe', key: 'afCard.clear', sample: sampleOnly || undefined, clear: true, review: false };
}

export function trackerState(data: StoreData, v: View): CheckState & { entry?: TrackerEntry & Sampled } {
  const real = latestTracker(data.trackerEntries);
  const entry = real ?? (v.showSample && v.sample ? latestTracker(v.sample.trackerEntries) : undefined);
  if (!entry) return { tone: 'off', key: 'trackerCard.none', clear: false, review: false };
  return {
    tone: TRACKER_TONE[entry.result],
    key: `trk.cls.${entry.result}` as TKey,
    sample: !real || undefined,
    clear: entry.result === 'none',
    review: entry.result === 'tracker' || entry.result === 'unknown',
    entry,
  };
}

/* ---------- Exposure ---------- */

export type ExposureKey = 'movement' | 'location' | 'messages' | 'photos' | 'device';
export const EXPOSURE_KEYS: ExposureKey[] = ['movement', 'location', 'messages', 'photos', 'device'];
export type Finding = Sampled & {
  id: string;
  category: ExposureKey;
  title: string;
  titleKey?: TKey;
  lineKey: TKey;
  tone: Tone;
  saved: boolean;
  at: number;
  href: string;
  params?: Record<string, string>;
};

const CHECK_CATEGORY: Record<string, ExposureKey> = {
  google_devices: 'photos',
  whatsapp_linked: 'messages',
  apple_devices: 'photos',
  google_activity: 'messages',
  meta_sessions: 'messages',
  telegram_devices: 'messages',
  location_sharing: 'location',
  whatsapp_live: 'location',
  recovery_info: 'messages',
  family_sharing: 'location',
};

/** Findings that may need her attention, from real records and labelled samples. */
export function findings(data: StoreData, v: View): Finding[] {
  const out: Finding[] = [];
  for (const c of ACCOUNT_CHECKS) {
    const a = data.accountAnswers[c.id];
    if (a?.status === 'review')
      out.push({ id: `f-${c.id}`, category: CHECK_CATEGORY[c.id], title: a.note ?? '', titleKey: checkKey(c.id, 'title'), lineKey: 'exp.line.account', tone: 'look', saved: v.isSaved('account', c.id), at: a.at, href: '/account-item', params: { id: c.id } });
  }
  for (const q of v.quietEntries)
    if (q.status === 'review')
      out.push({ id: `f-${q.id}`, category: q.area === 'location' ? 'location' : 'device', title: q.note ?? '', titleKey: `quiet.${q.area}` as TKey, lineKey: 'exp.line.quiet', tone: 'look', saved: v.isSaved('quiet', q.id), at: q.at, href: '/digital-footprint-audit', sample: q.sample });
  for (const t of v.trackerEntries)
    if (t.result === 'tracker' || t.result === 'unknown')
      out.push({ id: `f-${t.id}`, category: 'movement', title: t.note ?? '', titleKey: `trk.cls.${t.result}` as TKey, lineKey: 'exp.line.tracker', tone: TRACKER_TONE[t.result], saved: v.isSaved('tracker', t.id), at: t.at, href: t.sample ? '/tracker' : '/tracker-detail', params: t.sample ? undefined : { id: t.id }, sample: t.sample });
  for (const e of v.events)
    if (e.review !== 'me') {
      const b = v.baitOf(e.baitId);
      out.push({
        id: `f-${e.id}`,
        category: e.kind === 'link' ? 'messages' : 'device',
        title: b?.name ?? '',
        lineKey: e.kind === 'link' ? 'exp.line.link' : 'exp.line.decoy',
        tone: e.review === 'notMe' ? 'act' : 'look',
        saved: v.isSaved(e.kind === 'link' ? 'link' : 'bait', e.id),
        at: e.at,
        href: '/bait-detail',
        params: { id: e.baitId },
        sample: e.sample,
      });
    }
  for (const s of v.sessions)
    if (s.status === 'unfamiliar')
      out.push({ id: `f-${s.id}`, category: s.service === 'WhatsApp' ? 'messages' : 'photos', title: `${s.service} · ${s.device}`, lineKey: 'exp.line.session', tone: 'look', saved: v.evidence.some((x) => x.refId === s.id), at: s.lastActive, href: '/session', params: { id: s.id }, sample: true });
  for (const s of v.sharing)
    if (s.status === 'review')
      out.push({ id: `f-${s.id}`, category: s.setting === 'recovery' ? 'messages' : 'location', title: s.service, titleKey: `acct.share.${s.setting}` as TKey, lineKey: 'exp.line.sharing', tone: 'look', saved: false, at: Date.now() - 3 * 3600_000, href: '/accounts', params: { tab: 'sharing' }, sample: true });
  const rank: Record<Tone, number> = { act: 0, look: 1, off: 2, safe: 3 };
  return out.sort((a, b) => Number(a.saved) - Number(b.saved) || rank[a.tone] - rank[b.tone] || b.at - a.at);
}

/** Per-category overview: worst open finding, else whether anything in it was checked. */
export function exposureOverview(data: StoreData, v: View, list: Finding[]) {
  const checked: Record<ExposureKey, boolean> = {
    movement: v.trackerEntries.length > 0,
    location: v.quietEntries.some((q) => q.area === 'location') || v.sharing.length > 0 || ACCOUNT_CHECKS.some((c) => CHECK_CATEGORY[c.id] === 'location' && data.accountAnswers[c.id]),
    messages: v.sessions.length > 0 || ACCOUNT_CHECKS.some((c) => CHECK_CATEGORY[c.id] === 'messages' && data.accountAnswers[c.id]) || v.events.some((e) => e.kind === 'link'),
    photos: v.sessions.length > 0 || ACCOUNT_CHECKS.some((c) => CHECK_CATEGORY[c.id] === 'photos' && data.accountAnswers[c.id]),
    device: v.quietEntries.some((q) => q.area !== 'location') || v.events.some((e) => e.kind === 'decoy'),
  };
  return EXPOSURE_KEYS.map((key) => {
    const open = list.filter((f) => f.category === key && !f.saved);
    const worst = open.find((f) => f.tone === 'act') ?? open[0];
    const tone: Tone = worst ? worst.tone : checked[key] ? 'safe' : 'off';
    return { key, tone, open: open.length, checked: checked[key] };
  });
}

export { checkKey };
