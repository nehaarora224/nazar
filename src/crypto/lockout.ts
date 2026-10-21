/**
 * Retry protection for PIN unlock. Pure functions over a small, NON-secret guard record (it holds
 * no PIN and no key), so it can be persisted in plain storage and unit-tested directly.
 *
 * After a threshold of consecutive wrong PINs, unlock is locked out for an escalating window. This,
 * together with the deliberately slow scrypt KDF (each guess is expensive), is the retry protection.
 */

export type Guard = { fails: number; lockUntil: number };

export const EMPTY_GUARD: Guard = { fails: 0, lockUntil: 0 };

/** Wrong guesses allowed before the first lockout kicks in. */
export const FREE_ATTEMPTS = 5;
const BASE_LOCK_SEC = 30;
const MAX_LOCK_SEC = 15 * 60;

/** Lock window (seconds) after `fails` consecutive wrong PINs. 0 while under the threshold. */
export function lockSeconds(fails: number): number {
  if (fails < FREE_ATTEMPTS) return 0;
  return Math.min(MAX_LOCK_SEC, BASE_LOCK_SEC * 2 ** (fails - FREE_ATTEMPTS));
}

/** Milliseconds of lockout remaining, or 0 if unlock is currently allowed. */
export function lockRemaining(guard: Guard, now: number): number {
  return Math.max(0, guard.lockUntil - now);
}

export function isLockedOut(guard: Guard, now: number): boolean {
  return lockRemaining(guard, now) > 0;
}

/** Apply one failed attempt: bump the counter and set the next lockout window. */
export function registerFailure(guard: Guard, now: number): Guard {
  const fails = guard.fails + 1;
  const sec = lockSeconds(fails);
  return { fails, lockUntil: sec > 0 ? now + sec * 1000 : guard.lockUntil };
}

/** Clear all retry state after a successful unlock. */
export function registerSuccess(): Guard {
  return { ...EMPTY_GUARD };
}
