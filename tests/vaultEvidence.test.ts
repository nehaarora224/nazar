import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Evidence, StoreData } from '../src/store.ts';
import { autoItems, buildVault, classify, manualItem, searchVault } from '../src/vaultModel.ts';

/* ---------- classification ---------- */

test('classify separates confirmed, reported and unverified', () => {
  assert.equal(classify({ group: 'bait_catch', confirmed: true, review: 'notMe' }).relevance, 'confirmed');
  assert.equal(classify({ group: 'manual', confirmed: false, category: 'suspicious_login' }).relevance, 'reported');
  assert.equal(classify({ group: 'bait_created', confirmed: false }).relevance, 'unverified');
  assert.equal(classify({ group: 'permaudit', confirmed: true, nothingFound: true }).relevance, 'unverified');
});

test('catch severity follows the "was this you?" answer', () => {
  assert.equal(classify({ group: 'bait_catch', confirmed: true, review: 'notMe' }).severity, 'high');
  assert.equal(classify({ group: 'bait_catch', confirmed: true, review: 'unsure' }).severity, 'medium');
  assert.equal(classify({ group: 'bait_catch', confirmed: true, review: 'me' }).severity, 'info');
});

test('a concern word only nudges severity up one step, and only when not unverified', () => {
  const plain = classify({ group: 'manual', confirmed: false, category: 'other', text: 'lost my charger' });
  const worded = classify({ group: 'manual', confirmed: false, category: 'other', text: 'I think I am being followed' });
  assert.equal(plain.severity, 'low');
  assert.equal(worded.severity, 'medium'); // low -> medium
  assert.equal(worded.keywordBump, true);
  // Unverified can't be bumped above low, even with a strong word.
  const unv = classify({ group: 'bait_created', confirmed: false, text: 'camera recording stalker' });
  assert.ok(['info', 'low'].includes(unv.severity));
  assert.equal(unv.keywordBump, false);
});

/* ---------- auto collection ---------- */

const data = {
  evidence: [] as Evidence[],
  emailBaits: [{ id: 'b1', name: 'Salary slip', createdAt: 10, send: { status: 'sent', at: 20 } }],
  baits: [{ id: 'd1', name: 'History decoy', createdAt: 5 }],
  linkEvents: [{ id: 'l1', baitId: 'b1', at: 30, review: 'notMe' }],
  baitEvents: [{ id: 'be1', baitId: 'd1', at: 40 }],
} as unknown as StoreData;

test('auto-collects real bait/decoy events (opens, sent, created)', () => {
  const items = autoItems(data);
  const keys = items.map((i) => i.key);
  assert.ok(keys.includes('auto-link:l1')); // confirmed link open
  assert.ok(keys.includes('auto-decoy:be1')); // confirmed decoy open
  assert.ok(keys.includes('auto-sent:b1'));
  assert.ok(keys.includes('auto-created:b1'));
  assert.ok(keys.includes('auto-created:d1'));
  const link = items.find((i) => i.key === 'auto-link:l1')!;
  assert.equal(link.relevance, 'confirmed');
  assert.equal(link.severity, 'high'); // notMe
  assert.equal(link.subtitle, 'Salary slip');
});

test('buildVault sorts newest first and dedupes a saved catch against its auto copy', () => {
  const saved: Evidence = { kind: 'link', id: 'ev1', refId: 'l1', savedAt: 50, eventAt: 30, baitName: 'Salary slip', template: 'email_verification' };
  const withSave = { ...data, evidence: [saved] } as StoreData;
  const items = buildVault(withSave);
  // the link open appears exactly once (the saved record), not twice
  const linkItems = items.filter((i) => i.sourceEventId === 'l1' || i.evidenceId === 'ev1');
  assert.equal(linkItems.length, 1);
  assert.equal(linkItems[0].origin, 'manual');
  // newest first
  const ats = items.map((i) => i.at);
  assert.deepEqual(ats, [...ats].sort((a, b) => b - a));
});

/* ---------- manual mapping, override, search/filter ---------- */

test('manualItem maps a hand-added note and honours the severity override', () => {
  const note: Evidence = {
    kind: 'note',
    id: 'n1',
    refId: 'n1',
    savedAt: 100,
    eventAt: 90,
    title: 'Unknown laptop on my account',
    category: 'suspicious_login',
    description: 'Windows device I do not own',
    severity: 'high', // user override
  };
  const it = manualItem(note);
  assert.equal(it.origin, 'manual');
  assert.equal(it.relevance, 'reported');
  assert.equal(it.severity, 'high'); // override beats the suggested 'medium'
  assert.equal(it.evidenceId, 'n1');
  assert.ok(it.text.includes('unknown laptop'));
});

test('searchVault filters by text and by relevance', () => {
  const items = buildVault(data);
  assert.ok(searchVault(items, 'salary', 'all').length >= 1);
  assert.equal(searchVault(items, 'nonexistent-xyz', 'all').length, 0);
  const confirmed = searchVault(items, '', 'confirmed');
  assert.ok(confirmed.length > 0 && confirmed.every((i) => i.relevance === 'confirmed'));
  const unverified = searchVault(items, '', 'unverified');
  assert.ok(unverified.every((i) => i.relevance === 'unverified'));
});
