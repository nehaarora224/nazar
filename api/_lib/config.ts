// Server-side configuration for the Bait Test backend. All secrets come from environment
// variables set in the hosting provider (Vercel) — never from the client bundle or source.

export const config = {
  // Where the app is deployed. Used to build the link that goes in the bait email.
  // Vercel sets VERCEL_URL to the deployment host; BAIT_PUBLIC_URL overrides it (custom domain).
  baseUrl: (process.env.BAIT_PUBLIC_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')).replace(/\/$/, ''),

  // Email provider. When RESEND_API_KEY is absent the provider is "unconfigured":
  // nothing is sent and the API reports that honestly (it never fakes a delivery).
  resendApiKey: process.env.RESEND_API_KEY || '',
  // Must be a verified sender on the Resend account/domain. No brand impersonation.
  mailFrom: process.env.BAIT_MAIL_FROM || '',
  // Svix-style signing secret for Resend webhooks ("whsec_..."). Required to accept events.
  webhookSecret: process.env.RESEND_WEBHOOK_SECRET || '',

  // Durable storage (Vercel KV / Upstash Redis REST). When absent, an in-memory store is
  // used: fine for local runs and tests, NOT durable across serverless invocations.
  kvUrl: process.env.KV_REST_API_URL || '',
  kvToken: process.env.KV_REST_API_TOKEN || '',

  // How long a bait link stays live before it is treated as expired.
  tokenTtlDays: Number(process.env.BAIT_TOKEN_TTL_DAYS || 30),
  // How long records are retained before automatic deletion.
  retentionDays: Number(process.env.BAIT_RETENTION_DAYS || 90),

  // Anti-abuse. Per-owner creates and per-link accesses within the window.
  maxCreatesPerDay: Number(process.env.BAIT_MAX_CREATES_PER_DAY || 25),
  maxAccessesPerToken: Number(process.env.BAIT_MAX_ACCESSES_PER_TOKEN || 200),
  // Reject webhook deliveries whose timestamp is outside this tolerance (seconds).
  webhookToleranceSec: 60 * 5,
} as const;

export const providerConfigured = () => !!config.resendApiKey && !!config.mailFrom;
export const DAY_MS = 24 * 60 * 60 * 1000;
