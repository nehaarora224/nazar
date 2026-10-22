import type { TKey } from './i18n/en';

/**
 * Adaptive Safe-Plan engine — pure, transparent, rule-based. No React, storage, crypto, network or
 * AI: the situation never leaves the device, and the plan is derived from explicit, inspectable
 * rules below (not a model's judgement). Nothing here diagnoses surveillance; it only prioritises
 * which of the app's existing, safe checks are worth doing, and says plainly why each was suggested.
 */

/** The concerns a person can select (guided prompts). "unsure" is the no-clear-evidence path. */
export type PlanConcern = 'accounts' | 'location' | 'trackers' | 'device' | 'footprint' | 'unsure';
export const PLAN_CONCERNS: PlanConcern[] = ['accounts', 'location', 'trackers', 'device', 'footprint', 'unsure'];

export type PlanTaskStatus = 'todo' | 'done' | 'skipped' | 'postponed' | 'dismissed';
/** Why a task is in the plan: a concern the person selected, or an always-safe foundation step. */
export type TaskReason = PlanConcern | 'foundation';

export type PlanTask = { id: string; status: PlanTaskStatus; reason: TaskReason; addedAt: number; updatedAt: number };

/** The person's own description. All optional — no required identifying details. */
export type Situation = { text?: string; concerns: PlanConcern[]; updatedAt: number };

type AreaSpec = 'foundation' | PlanConcern[];
export type PlanTaskDef = {
  id: string;
  /** 'foundation' = always included; otherwise the concerns that trigger it. */
  areas: AreaSpec;
  /** Lower runs earlier. Safe order: preserve → reach support → low-risk checks → escalating changes. */
  priority: number;
  /** True for steps that someone watching the phone/accounts might notice. Shown with a "May notice" pill. */
  mayNotice?: boolean;
  /** An existing in-app capability this task maps to (optional). */
  href?: string;
  hrefParams?: Record<string, string>;
};

/**
 * The task catalogue. Each covers one of the required situations; content (why/steps/observations/
 * limitations/safer-alternative) lives in i18n under `plt.<id>.<part>`.
 */
export const PLAN_TASK_DEFS: PlanTaskDef[] = [
  { id: 'preserve', areas: 'foundation', priority: 0, href: '/vault-add' },
  { id: 'support', areas: 'foundation', priority: 1 },
  { id: 'uncertain_start', areas: ['unsure'], priority: 5 },
  { id: 'accounts_review', areas: ['accounts'], priority: 10, href: '/account-add' },
  { id: 'location_review', areas: ['location'], priority: 20, href: '/exposure' },
  { id: 'tracker_scan', areas: ['trackers'], priority: 30, href: '/tracker' },
  { id: 'device_settings', areas: ['device'], priority: 40, href: '/permission-audit' },
  { id: 'footprint_audit', areas: ['footprint'], priority: 50, href: '/digital-footprint-audit' },
  // Escalating changes (sign-outs, password changes). Only when accounts/device are a concern, always last.
  { id: 'secure_changes', areas: ['accounts', 'device'], priority: 90, mayNotice: true },
];

const DEF_BY_ID: Record<string, PlanTaskDef> = Object.fromEntries(PLAN_TASK_DEFS.map((d) => [d.id, d]));
export const planTaskDef = (id: string): PlanTaskDef | undefined => DEF_BY_ID[id];

const ACTIVE_STATUSES: PlanTaskStatus[] = ['todo', 'postponed'];

/** The task ids a given set of concerns should produce, in safe order, each with the reason it applies. */
export function desiredTasks(concerns: PlanConcern[]): { id: string; reason: TaskReason }[] {
  // No concern selected → the gentle "uncertain" path (foundation + a calm first look). Never empty.
  const selected: PlanConcern[] = concerns.length ? concerns : ['unsure'];
  const out: { id: string; reason: TaskReason }[] = [];
  for (const def of [...PLAN_TASK_DEFS].sort((a, b) => a.priority - b.priority)) {
    if (def.areas === 'foundation') {
      out.push({ id: def.id, reason: 'foundation' });
      continue;
    }
    const hit = def.areas.find((a) => selected.includes(a));
    if (hit) out.push({ id: def.id, reason: hit });
  }
  return out;
}

/**
 * Regenerate the plan from concerns while preserving progress:
 *  - a desired task that already exists keeps its status (reason refreshed);
 *  - a newly desired task is added as 'todo';
 *  - an existing task that is no longer desired is kept ONLY if it was acted on (not plain 'todo'),
 *    so completed/skipped/postponed/dismissed decisions are never lost and nothing is duplicated.
 */
export function mergePlan(existing: PlanTask[], concerns: PlanConcern[], now: number): PlanTask[] {
  const desired = desiredTasks(concerns);
  const desiredIds = new Set(desired.map((d) => d.id));
  const byId = new Map(existing.map((t) => [t.id, t]));
  const result: PlanTask[] = [];
  for (const { id, reason } of desired) {
    const prev = byId.get(id);
    result.push(prev ? (prev.reason === reason ? prev : { ...prev, reason }) : { id, status: 'todo', reason, addedAt: now, updatedAt: now });
  }
  for (const t of existing) {
    if (!desiredIds.has(t.id) && t.status !== 'todo') result.push(t);
  }
  return result;
}

export function setTaskStatus(list: PlanTask[], id: string, status: PlanTaskStatus, now: number): PlanTask[] {
  return list.map((t) => (t.id === id ? { ...t, status, updatedAt: now } : t));
}

/** Display order: active tasks (to-do/postponed) first, then resolved ones, each by safe-order priority. */
export function orderedPlan(list: PlanTask[]): PlanTask[] {
  const rank = (t: PlanTask) => (ACTIVE_STATUSES.includes(t.status) ? 0 : 1);
  const prio = (id: string) => planTaskDef(id)?.priority ?? 999;
  return [...list].sort((a, b) => rank(a) - rank(b) || prio(a.id) - prio(b.id));
}

export function planSummary(list: PlanTask[]) {
  const visible = list.filter((t) => t.status !== 'dismissed');
  return {
    total: visible.length,
    done: visible.filter((t) => t.status === 'done').length,
    todo: visible.filter((t) => t.status === 'todo').length,
    postponed: visible.filter((t) => t.status === 'postponed').length,
    active: visible.filter((t) => ACTIVE_STATUSES.includes(t.status)).length,
    dismissed: list.filter((t) => t.status === 'dismissed').length,
  };
}

/* ---- i18n key helpers ---- */
export const planTaskKey = (id: string, part: 'title' | 'why' | 'steps' | 'obs' | 'limits' | 'alt'): TKey => `plt.${id}.${part}` as TKey;
export const concernKey = (c: PlanConcern, part: 'label' | 'desc'): TKey => `plc.${c}.${part}` as TKey;
export const reasonKey = (r: TaskReason): TKey => `plr.${r}` as TKey;
