import { gcm } from '@noble/ciphers/aes';
import { scrypt } from '@noble/hashes/scrypt';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';

/**
 * Vault cryptography — pure, platform-independent, and dependency-injected for randomness so it
 * runs and is unit-tested identically on web, React Native (Hermes) and Node.
 *
 * Design: PIN-wraps-DEK (data-encryption key).
 *   - A random 256-bit DEK encrypts the data blob (AES-256-GCM).
 *   - The DEK is itself encrypted ("wrapped") under a key-encryption key (KEK) derived from the
 *     user's PIN with scrypt (memory-hard) + a random salt + an optional device pepper.
 *   - The PIN is never stored. A wrong PIN produces a wrong KEK, so unwrapping the DEK fails the
 *     GCM auth tag — that failure IS the PIN check. No separate plaintext verifier exists.
 *
 * Honest limit: a short numeric PIN has a small keyspace, so anyone who exfiltrates the envelope
 * can try every PIN offline, bounded only by the scrypt cost. The device pepper (a secret held in
 * the platform keystore, see deviceSecret.ts) is what makes offline guessing infeasible; it needs
 * a native build, so until then prefer a longer PIN. This module never claims more than it does.
 */

export type KdfParams = { N: number; r: number; p: number; dkLen: number };
/** ~16 MiB, ~100–300 ms on a phone: slows brute force without making unlock feel broken. */
export const DEFAULT_KDF: KdfParams = { N: 1 << 14, r: 8, p: 1, dkLen: 32 };

export const CURRENT_VAULT_VERSION = 1 as const;

/** What is written to disk. Everything here is safe at rest: it is useless without the PIN. */
export type VaultEnvelope = {
  v: typeof CURRENT_VAULT_VERSION;
  kdf: KdfParams;
  salt: string; // hex — scrypt salt
  wrap: string; // hex — AES-GCM(KEK) over the DEK: nonce(12) ‖ ciphertext ‖ tag
  data: string; // hex — AES-GCM(DEK) over the UTF-8 plaintext: nonce(12) ‖ ciphertext ‖ tag
};

/** Random source: 32 cryptographically-secure bytes etc. Injected (expo-crypto in the app, node:crypto in tests). */
export type RandomBytes = (n: number) => Uint8Array;

export class WrongPinError extends Error {
  constructor() {
    super('wrong_pin');
    this.name = 'WrongPinError';
  }
}
export class VaultCorruptError extends Error {
  constructor(msg = 'vault_corrupt') {
    super(msg);
    this.name = 'VaultCorruptError';
  }
}

const NONCE_LEN = 12;
const SALT_LEN = 16;

function deriveKek(pin: string, salt: Uint8Array, params: KdfParams, pepper: Uint8Array | null): Uint8Array {
  // Fold the device pepper (when present) into the password so the KEK depends on a keystore secret.
  const pinBytes = utf8ToBytes(pin);
  const pw = pepper && pepper.length ? concat(pinBytes, pepper) : pinBytes;
  return scrypt(pw, salt, { N: params.N, r: params.r, p: params.p, dkLen: params.dkLen });
}

/** AES-256-GCM seal → nonce ‖ ciphertext ‖ tag. A fresh random nonce per call (never reused under a key). */
function seal(key: Uint8Array, plaintext: Uint8Array, rnd: RandomBytes): Uint8Array {
  const nonce = rnd(NONCE_LEN);
  const ct = gcm(key, nonce).encrypt(plaintext);
  return concat(nonce, ct);
}

/** AES-256-GCM open. Throws if the tag is invalid (wrong key or tampered data). */
function open(key: Uint8Array, sealed: Uint8Array): Uint8Array {
  if (sealed.length <= NONCE_LEN) throw new VaultCorruptError('sealed_too_short');
  const nonce = sealed.subarray(0, NONCE_LEN);
  const ct = sealed.subarray(NONCE_LEN);
  return gcm(key, nonce).decrypt(ct);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/** Create a fresh vault around `plaintext` (UTF-8), protected by `pin`. Generates a new DEK and salt. */
export function createEnvelope(
  pin: string,
  plaintext: string,
  rnd: RandomBytes,
  pepper: Uint8Array | null = null,
  params: KdfParams = DEFAULT_KDF,
): VaultEnvelope {
  const salt = rnd(SALT_LEN);
  const dek = rnd(32);
  const kek = deriveKek(pin, salt, params, pepper);
  const wrap = seal(kek, dek, rnd);
  const data = seal(dek, utf8ToBytes(plaintext), rnd);
  return { v: CURRENT_VAULT_VERSION, kdf: params, salt: bytesToHex(salt), wrap: bytesToHex(wrap), data: bytesToHex(data) };
}

/**
 * Unlock a vault with `pin`. Returns the raw DEK (kept in memory for re-encrypting on save) and the
 * decrypted plaintext. Throws WrongPinError if the PIN is wrong, VaultCorruptError if the blob is damaged.
 */
export function openEnvelope(pin: string, env: VaultEnvelope, pepper: Uint8Array | null = null): { dek: Uint8Array; plaintext: string } {
  if (!env || env.v !== CURRENT_VAULT_VERSION) throw new VaultCorruptError('unsupported_version');
  const kek = deriveKek(pin, hexToBytes(env.salt), env.kdf, pepper);
  let dek: Uint8Array;
  try {
    dek = open(kek, hexToBytes(env.wrap));
  } catch {
    // A bad GCM tag on the wrapped DEK means the derived KEK was wrong → the PIN was wrong.
    throw new WrongPinError();
  }
  let plaintext: Uint8Array;
  try {
    plaintext = open(dek, hexToBytes(env.data));
  } catch {
    // DEK unwrapped (PIN was right) but the data blob won't open → it is corrupt, not a wrong PIN.
    throw new VaultCorruptError('data_auth_failed');
  }
  return { dek, plaintext: new TextDecoder().decode(plaintext) };
}

/** Re-encrypt `plaintext` under an already-unwrapped DEK (used on every save; no KDF, so it's fast). */
export function sealData(dek: Uint8Array, plaintext: string, env: VaultEnvelope, rnd: RandomBytes): VaultEnvelope {
  return { ...env, data: bytesToHex(seal(dek, utf8ToBytes(plaintext), rnd)) };
}

/** Change the PIN: re-wrap the SAME DEK (so the data blob doesn't need re-encrypting) under a new KEK. */
export function rewrapPin(
  oldPin: string,
  newPin: string,
  env: VaultEnvelope,
  rnd: RandomBytes,
  pepper: Uint8Array | null = null,
  params: KdfParams = DEFAULT_KDF,
): VaultEnvelope {
  const { dek } = openEnvelope(oldPin, env, pepper); // throws WrongPinError if oldPin is wrong
  const salt = rnd(SALT_LEN);
  const kek = deriveKek(newPin, salt, params, pepper);
  return { ...env, kdf: params, salt: bytesToHex(salt), wrap: bytesToHex(seal(kek, dek, rnd)) };
}
