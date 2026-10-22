import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  desiredTasks,
  mergePlan,
  setTaskStatus,
  orderedPlan,
  planSummary,
  PLAN_TASK_DEFS,
  type PlanConcern,
  type PlanTask,
} from '../src/plan.ts';

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

test('no concerns → the gentle uncertain path (foundation + a calm first look only)', () => {
  const d = desiredTasks([]);
  assert.deepEqual(ids(d), ['preserve', 'support', 'uncertain_start']);
  // It must not jump to escalating changes or imply a confirmed finding.
  assert.ok(!ids(d).includes('secure_changes'));
});

test('a concern pulls in its task plus the always-on foundation, in safe-order priority', () => {
  const d = desiredTasks(['trackers']);
  assert.deepEqual(ids(d), ['preserve', 'support', 'tracker_scan']);
  // priorities are non-decreasing (safe order preserved)
  const prio = d.map((x) => PLAN_TASK_DEFS.find((def) => def.id === x.id)!.priority);
  assert.deepEqual(prio, [...prio].sort((a, b) => a - b));
});

test('escalating "secure_changes" appears only for accounts/device concerns, always last', () => {
  assert.ok(ids(desiredTasks(['accounts'])).includes('secure_changes'));
  assert.ok(ids(desiredTasks(['device'])).includes('secure_changes'));
  assert.ok(!ids(desiredTasks(['location'])).includes('secure_changes'));
  const d = desiredTasks(['accounts']);
  assert.equal(ids(d)[ids(d).length - 1], 'secure_changes');
});

test('each task reason is transparent (the concern that triggered it, or foundation)', () => {
  const d = desiredTasks(['location']);
  assert.equal(d.find((x) => x.id === 'location_review')!.reason, 'location');
  assert.equal(d.find((x) => x.id === 'preserve')!.reason, 'foundation');
});

test('mergePlan preserves completed progress when the plan changes, without duplicating', () => {
  let plan = mergePlan([], ['trackers'], 1);
  plan = setTaskStatus(plan, 'tracker_scan', 'done', 2);
  // Concern removed: the completed task is KEPT (progress preserved)...
  const next = mergePlan(plan, ['location'], 3);
  const scan = next.find((t) => t.id === 'tracker_scan')!;
  assert.equal(scan.status, 'done');
  assert.ok(ids(next).includes('location_review')); // new concern added
  // ...and re-adding the concern does not create a second copy.
  const again = mergePlan(next, ['trackers', 'location'], 4);
  assert.equal(again.filter((t) => t.id === 'tracker_scan').length, 1);
  assert.equal(again.find((t) => t.id === 'tracker_scan')!.status, 'done');
});

test('mergePlan drops an untouched to-do that is no longer relevant (avoids clutter)', () => {
  const plan = mergePlan([], ['trackers'], 1); // tracker_scan is plain to-do
  const next = mergePlan(plan, ['location'], 2);
  assert.ok(!ids(next).includes('tracker_scan'));
});

test('a dismissed task is not resurrected to to-do when its concern returns', () => {
  let plan = mergePlan([], ['device'], 1);
  plan = setTaskStatus(plan, 'device_settings', 'dismissed', 2);
  const next = mergePlan(plan, ['device'], 3);
  assert.equal(next.find((t) => t.id === 'device_settings')!.status, 'dismissed');
  assert.equal(next.filter((t) => t.id === 'device_settings').length, 1);
});

test('orderedPlan puts active tasks before resolved ones', () => {
  let plan = mergePlan([], ['accounts'], 1);
  plan = setTaskStatus(plan, 'preserve', 'done', 2);
  const ordered = orderedPlan(plan);
  const firstResolved = ordered.findIndex((t) => t.status === 'done');
  const lastActive = ordered.map((t) => t.status).lastIndexOf('todo');
  assert.ok(lastActive < firstResolved);
});

test('planSummary counts statuses and excludes dismissed from the total', () => {
  let plan: PlanTask[] = mergePlan([], ['accounts', 'device'] as PlanConcern[], 1);
  plan = setTaskStatus(plan, 'preserve', 'done', 2);
  plan = setTaskStatus(plan, 'support', 'postponed', 3);
  plan = setTaskStatus(plan, 'secure_changes', 'dismissed', 4);
  const s = planSummary(plan);
  assert.equal(s.done, 1);
  assert.equal(s.postponed, 1);
  assert.equal(s.dismissed, 1);
  assert.equal(s.total, plan.length - 1); // dismissed excluded
});
