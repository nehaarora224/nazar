import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  EMPTY_GUARD,
  FREE_ATTEMPTS,
  lockSeconds,
  lockRemaining,
  isLockedOut,
  registerFailure,
  registerSuccess,
} from '../src/crypto/lockout.ts';

test('no lockout under the free-attempt threshold', () => {
  assert.equal(lockSeconds(0), 0);
  assert.equal(lockSeconds(FREE_ATTEMPTS - 1), 0);
  assert.equal(isLockedOut(EMPTY_GUARD, Date.now()), false);
});

test('lockout starts at the threshold and escalates, capped at 15 min', () => {
  assert.equal(lockSeconds(5), 30);
  assert.equal(lockSeconds(6), 60);
  assert.equal(lockSeconds(7), 120);
  assert.equal(lockSeconds(9), 480);
  assert.equal(lockSeconds(50), 15 * 60); // capped
});

test('registerFailure sets an active lockout window once past the threshold', () => {
  const now = 1_000_000;
  let g = EMPTY_GUARD;
  for (let i = 0; i < FREE_ATTEMPTS; i++) g = registerFailure(g, now);
  assert.equal(g.fails, FREE_ATTEMPTS);
  assert.ok(isLockedOut(g, now));
  assert.equal(lockRemaining(g, now), 30_000);
  // Still locked part-way through, free once it elapses.
  assert.ok(isLockedOut(g, now + 29_000));
  assert.equal(isLockedOut(g, now + 30_001), false);
});

test('a successful unlock clears all retry state', () => {
  const now = Date.now();
  let g = EMPTY_GUARD;
  for (let i = 0; i < 7; i++) g = registerFailure(g, now);
  assert.ok(g.fails > 0 && g.lockUntil > 0);
  g = registerSuccess();
  assert.deepEqual(g, EMPTY_GUARD);
  assert.equal(isLockedOut(g, now), false);
});
