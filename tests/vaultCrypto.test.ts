import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createEnvelope,
  openEnvelope,
  sealData,
  rewrapPin,
  WrongPinError,
  VaultCorruptError,
  type KdfParams,
} from '../src/crypto/vaultCrypto.ts';

// A Uint8Array RNG backed by Node's CSPRNG (the app injects expo-crypto's getRandomBytes instead).
const rnd = (n: number) => new Uint8Array(randomBytes(n));
// Cheap KDF so the suite stays fast; correctness is identical to the production params.
const FAST: KdfParams = { N: 1 << 8, r: 8, p: 1, dkLen: 32 };

const SECRET = JSON.stringify({ evidence: ['a snoop was caught'], note: 'निजी' });

test('round-trips the plaintext with the correct PIN', () => {
  const env = createEnvelope('824193', SECRET, rnd, null, FAST);
  const { plaintext } = openEnvelope('824193', env, null);
  assert.equal(plaintext, SECRET);
});

test('a wrong PIN throws WrongPinError (and never returns data)', () => {
  const env = createEnvelope('824193', SECRET, rnd, null, FAST);
  assert.throws(() => openEnvelope('824194', env, null), WrongPinError);
  assert.throws(() => openEnvelope('', env, null), WrongPinError);
});

test('nothing in the envelope is the plaintext or the PIN', () => {
  const env = createEnvelope('824193', SECRET, rnd, null, FAST);
  const blob = JSON.stringify(env);
  assert.ok(!blob.includes('snoop'));
  assert.ok(!blob.includes('निजी'));
  assert.ok(!blob.includes('824193'));
});

test('tampering with the ciphertext is detected (auth tag fails)', () => {
  const env = createEnvelope('824193', SECRET, rnd, null, FAST);
  // Flip the last byte of the data ciphertext.
  const bad = { ...env, data: env.data.slice(0, -2) + (env.data.slice(-2) === 'ff' ? '00' : 'ff') };
  assert.throws(() => openEnvelope('824193', bad, null), VaultCorruptError);
});

test('two vaults for the same PIN differ (random salt + DEK + nonces)', () => {
  const a = createEnvelope('824193', SECRET, rnd, null, FAST);
  const b = createEnvelope('824193', SECRET, rnd, null, FAST);
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.wrap, b.wrap);
  assert.notEqual(a.data, b.data);
});

test('sealData re-encrypts under the same DEK without the PIN', () => {
  const env = createEnvelope('824193', SECRET, rnd, null, FAST);
  const { dek } = openEnvelope('824193', env, null);
  const updated = sealData(dek, JSON.stringify({ evidence: ['second'] }), env, rnd);
  assert.equal(updated.salt, env.salt); // same key material
  assert.equal(updated.wrap, env.wrap);
  assert.notEqual(updated.data, env.data); // new ciphertext
  assert.equal(openEnvelope('824193', updated, null).plaintext, JSON.stringify({ evidence: ['second'] }));
});

test('the device pepper is required to open a peppered vault', () => {
  const pepper = rnd(32);
  const env = createEnvelope('824193', SECRET, rnd, pepper, FAST);
  // Correct PIN but missing/!wrong pepper must fail — proving the keystore secret is mixed in.
  assert.throws(() => openEnvelope('824193', env, null), WrongPinError);
  assert.throws(() => openEnvelope('824193', env, rnd(32)), WrongPinError);
  assert.equal(openEnvelope('824193', env, pepper).plaintext, SECRET);
});

test('changing the PIN keeps the data and rejects the old PIN', () => {
  const env = createEnvelope('824193', SECRET, rnd, null, FAST);
  const changed = rewrapPin('824193', '550071', env, rnd, null, FAST);
  assert.equal(changed.data, env.data); // same DEK, data not re-encrypted
  assert.throws(() => openEnvelope('824193', changed, null), WrongPinError);
  assert.equal(openEnvelope('550071', changed, null).plaintext, SECRET);
});

test('rewrapPin with the wrong old PIN throws and changes nothing', () => {
  const env = createEnvelope('824193', SECRET, rnd, null, FAST);
  assert.throws(() => rewrapPin('000000', '550071', env, rnd, null, FAST), WrongPinError);
});

test('an unsupported envelope version is rejected', () => {
  const env = createEnvelope('824193', SECRET, rnd, null, FAST);
  assert.throws(() => openEnvelope('824193', { ...env, v: 2 as unknown as 1 }, null), VaultCorruptError);
});

test('works with the production KDF params too', () => {
  const env = createEnvelope('longer-passphrase-9931', SECRET, rnd); // DEFAULT_KDF
  assert.equal(openEnvelope('longer-passphrase-9931', env).plaintext, SECRET);
});
