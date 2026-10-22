import assert from 'node:assert/strict';
import { test } from 'node:test';

import { rootScreen } from '../src/routing.ts';

test('loading shows a neutral splash (never the calculator or an actionable screen yet)', () => {
  assert.equal(rootScreen('loading'), 'loading');
});

test('first launch (no vault) goes to onboarding, not the bare calculator', () => {
  assert.equal(rootScreen('setup'), 'onboarding');
});

test('future launches (existing vault) open the calculator, where the PIN unlocks the Vault', () => {
  assert.equal(rootScreen('locked'), 'calculator');
  // Already-unlocked (e.g. just after setup) also shows the calculator; the PIN gate still applies.
  assert.equal(rootScreen('ready'), 'calculator');
});

test('a storage error still lands on the calculator rather than a dead-end', () => {
  assert.equal(rootScreen('error'), 'calculator');
});

test('onboarding is reached only from the setup state', () => {
  const screens = (['loading', 'setup', 'locked', 'ready', 'error'] as const).map(rootScreen);
  assert.equal(screens.filter((s) => s === 'onboarding').length, 1);
});
