import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildSample } from '../src/sample.ts';
import {
  createReviewAccount,
  patchReviewAccounts,
  dropReviewAccount,
  reviewAccountSummary,
  REVIEW_STATUSES,
  type ReviewAccount,
} from '../src/reviewAccounts.ts';

const mk = (over: Partial<ReviewAccount> = {}): ReviewAccount =>
  createReviewAccount({ service: over.service ?? 'google', serviceName: over.serviceName ?? 'Google', label: over.label }, over.id ?? 'id1', over.createdAt ?? 1000);

test('createReviewAccount starts Not checked, trims, and timestamps', () => {
  const a = createReviewAccount({ service: 'custom', serviceName: '  My Bank  ', label: '  priya  ' }, 'x1', 5000);
  assert.equal(a.status, 'not_checked');
  assert.equal(a.serviceName, 'My Bank');
  assert.equal(a.label, 'priya');
  assert.equal(a.createdAt, 5000);
  assert.equal(a.updatedAt, 5000);
  // An empty label becomes undefined, never a stored blank.
  assert.equal(createReviewAccount({ service: 'email', serviceName: 'Email', label: '   ' }, 'x2', 1).label, undefined);
});

test('patch updates status and bumps only the target account', () => {
  const list = [mk({ id: 'a' }), mk({ id: 'b' })];
  const next = patchReviewAccounts(list, 'a', { status: 'unfamiliar' }, 9000);
  assert.equal(next.find((x) => x.id === 'a')!.status, 'unfamiliar');
  assert.equal(next.find((x) => x.id === 'a')!.updatedAt, 9000);
  assert.equal(next.find((x) => x.id === 'b')!.updatedAt, 1000); // untouched
});

test('patch sets, then clears, note and label; blank name is ignored', () => {
  let list = [mk({ id: 'a', label: 'old' })];
  list = patchReviewAccounts(list, 'a', { note: '  found a laptop  ', label: '@me' }, 2);
  assert.equal(list[0].note, 'found a laptop');
  assert.equal(list[0].label, '@me');
  // Empty strings clear optional fields; a blank serviceName keeps the existing name.
  list = patchReviewAccounts(list, 'a', { note: '', label: '  ', serviceName: '   ' }, 3);
  assert.equal(list[0].note, undefined);
  assert.equal(list[0].label, undefined);
  assert.equal(list[0].serviceName, 'Google');
});

test('dropReviewAccount removes by id', () => {
  const list = [mk({ id: 'a' }), mk({ id: 'b' })];
  const next = dropReviewAccount(list, 'a');
  assert.equal(next.length, 1);
  assert.equal(next[0].id, 'b');
});

test('summary counts every status', () => {
  const list = [
    mk({ id: '1' }),
    patchReviewAccounts([mk({ id: '2' })], '2', { status: 'in_progress' }, 1)[0],
    patchReviewAccounts([mk({ id: '3' })], '3', { status: 'unfamiliar' }, 1)[0],
    patchReviewAccounts([mk({ id: '4' })], '4', { status: 'reviewed' }, 1)[0],
    patchReviewAccounts([mk({ id: '5' })], '5', { status: 'unfamiliar' }, 1)[0],
  ];
  const s = reviewAccountSummary(list);
  assert.deepEqual(s, { total: 5, notChecked: 1, inProgress: 1, attention: 2, reviewed: 1 });
  assert.equal(REVIEW_STATUSES.length, 4);
});

test('sample separation: demo accounts are labelled samples and carry no review-account shape', () => {
  const sample = buildSample(1_000_000);
  // The sample "accounts" are a different, clearly-labelled dataset...
  assert.ok(sample.accounts.every((a) => a.sample === true));
  // ...and user review-accounts are a separate store field, never produced by the sample builder.
  assert.ok(!('reviewAccounts' in sample));
  // A real review-account has no `sample` flag, so the two can never be confused.
  assert.equal('sample' in mk(), false);
});
