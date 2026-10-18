import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** A URL-safe opaque token. The raw token goes only to the recipient's email link. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 hex. We persist only hashes of tokens and owner secrets, never the raw value. */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Constant-time string compare that never throws on length mismatch. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still do a comparison to avoid an early-return timing signal.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/**
 * Verify a Svix/Resend webhook signature.
 * signedContent = `${id}.${timestamp}.${rawBody}`; expected = base64(HMAC_SHA256(secret, signedContent)).
 * The `svix-signature` header is a space-separated list of `v1,<sig>` entries; any match passes.
 */
export function verifyWebhook(opts: {
  secret: string;
  id?: string;
  timestamp?: string;
  signatureHeader?: string;
  rawBody: string;
  toleranceSec: number;
  nowSec?: number;
}): boolean {
  const { secret, id, timestamp, signatureHeader, rawBody, toleranceSec } = opts;
  if (!secret || !id || !timestamp || !signatureHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSec) return false;

  // Secret is "whsec_<base64>"; the signing key is the decoded base64 part.
  const key = secret.startsWith('whsec_') ? Buffer.from(secret.slice(6), 'base64') : Buffer.from(secret);
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64');

  const presented = signatureHeader.split(' ').map((p) => (p.includes(',') ? p.split(',')[1] : p));
  return presented.some((sig) => safeEqual(sig, expected));
}
