# Bait Test backend

Server-side functions for Nazar's **Bait Test** — an *authorized* security-awareness exercise.
Someone creates a test, previews the exact email and link, confirms they are allowed to send it to
that recipient, and the message goes out from the server. When the recipient opens the link they
reach a page that plainly says it was an awareness exercise. The owner can then review what was
recorded together with the recipient.

These functions run on Vercel (Node.js runtime, Web `Request → Response` handlers). The mobile app
talks to them through `src/baitService.ts`.

## Why a server

The email provider's API key must never ship in the app bundle, in source control, or in public
config. All sending happens here, with the key read from a server environment variable. The app
only ever receives honest status back — it never fakes a delivery.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/baits` | Create a test and dispatch the email. Returns `{ id, status }` where `status` is `accepted` (provider took the request — **not** proof of inbox delivery), `unconfigured` (no provider set up; nothing sent), or `failed`. |
| `GET` | `/api/baits/:id/events` | Owner-scoped. Recipient-side events: `link_access` and `interpretation`. |
| `GET` | `/api/baits/:id` | Owner-scoped status and event counts (`accepted`/`delivered`/`bounced`/`rejected`/`link_access`/`interpretation`). |
| `DELETE` | `/api/baits/:id` | Owner-scoped. Revoke and purge the test and its events. |
| `GET` | `/api/l/:token` | The authorized-exercise landing page. Records a `link_access` for live tokens. |
| `POST` | `/api/l/:token` | The recipient's interpretation (CSRF-protected). Records `interpretation`. |
| `POST` | `/api/webhooks/resend` | Resend delivery events. Signature-verified and de-duplicated. |

`POST /api/baits`, `GET/DELETE /api/baits/:id` and `/api/baits/:id/events` require
`Authorization: Bearer <ownerSecret>`. `ownerSecret` is a random secret the app generates **on the
device** and stores locally. It scopes tests to that device — it is **not** user authentication,
and the server never trusts an owner id supplied in the request body; it derives the owner only by
hashing the presented secret.

## Event taxonomy

Distinct types, never conflated:

- **accepted** — the provider accepted the send request. Not delivery.
- **delivered** — the provider confirmed delivery (webhook).
- **bounced** — hard bounce / undeliverable (webhook).
- **rejected** — complaint or blocked (webhook).
- **link_access** — the recipient opened the authorized link ("Recorded link access").
- **interpretation** — the recipient told the landing page how they read the message.

The mobile timeline surfaces `link_access` and `interpretation`. Delivery/bounce/rejected are
available via `GET /api/baits/:id`.

## Security controls

- **Secrets server-side only.** `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` live in Vercel env
  vars. Nothing secret is in the client bundle.
- **Hashed tokens.** The raw link token exists only in the recipient's email. The server stores
  `SHA-256(token)` and looks tests up by that hash.
- **Ownership checks.** Every owner-scoped route verifies `SHA-256(ownerSecret)` against the stored
  owner hash with a constant-time compare. Missing or wrong credentials get a generic `404`.
- **Webhook signature verification.** Svix/Resend `svix-id`/`svix-timestamp`/`svix-signature` are
  verified with HMAC-SHA256 over the exact raw body, with a timestamp tolerance. Forged events are
  rejected with `401`.
- **Idempotency.** Webhook deliveries are de-duplicated by `svix-id`.
- **CSRF.** The landing interpretation form uses a double-submit nonce (HttpOnly, SameSite=Strict
  cookie) checked with a constant-time compare.
- **Anti-enumeration.** The landing page returns the same body for valid and invalid tokens; only a
  live token records an access. A stranger poking random tokens learns nothing.
- **Rate limits.** Per-owner daily create cap and a per-token access cap. One recipient per call —
  there is no bulk send.
- **Token expiry & revocation.** Links expire after `BAIT_TOKEN_TTL_DAYS`; `DELETE` revokes early.
- **Retention.** Records auto-expire after `BAIT_RETENTION_DAYS`.
- **Safe logging & minimal data.** No tokens, recipient addresses, IP addresses, or device
  fingerprints are logged. Rate limiting is keyed by hashed owner/token, so no IPs are stored.
- **No credential capture, no impersonation.** Templates carry no brand names or logos, the email
  and landing page never ask for a password, verification code, or payment, and the landing page
  states it was an authorized exercise.

## Environment variables (set in Vercel, never committed)

| Variable | Required | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | to send | From the Resend dashboard. Without it, sending reports `unconfigured`. |
| `BAIT_MAIL_FROM` | to send | A sender on a **domain you verified in Resend** (e.g. `Awareness <noreply@yourdomain.com>`). No brand you don't own. |
| `RESEND_WEBHOOK_SECRET` | for webhooks | The signing secret (`whsec_…`) from the Resend webhook you create pointing at `/api/webhooks/resend`. |
| `BAIT_PUBLIC_URL` | recommended | The site's public URL, used to build the link. Falls back to the request host. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | for durability | Vercel KV / Upstash Redis. **Without these an in-memory store is used, which is not durable across serverless invocations** — fine for a demo, not for real tests. |
| `BAIT_TOKEN_TTL_DAYS` | optional | Link lifetime (default 30). |
| `BAIT_RETENTION_DAYS` | optional | Record retention (default 90). |
| `BAIT_MAX_CREATES_PER_DAY` | optional | Per-device daily cap (default 25). |
| `BAIT_MAX_ACCESSES_PER_TOKEN` | optional | Per-link access cap (default 200). |

The app points at the backend with `EXPO_PUBLIC_BAIT_API_URL` (the site root or its `/api` path) at
build time. If unset, the app shows sending as unavailable and sends nothing.

## Setup

1. Create a Resend account and **verify a domain** you control. Set `BAIT_MAIL_FROM` to a sender on it.
2. Add `RESEND_API_KEY` in Vercel project settings.
3. Add a Vercel KV store and link it (sets `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
4. In Resend, add a webhook to `https://<your-domain>/api/webhooks/resend`, subscribe to
   `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, and copy its signing
   secret into `RESEND_WEBHOOK_SECRET`.
5. Set `BAIT_PUBLIC_URL` to your deployment URL.
6. Build the app with `EXPO_PUBLIC_BAIT_API_URL=https://<your-domain>`.

## Tests

```bash
node --test --experimental-strip-types tests/baitApi.test.ts
```

Covers: missing/invalid owner credential, recipient/template validation, honest handling when the
provider is unconfigured, ownership isolation, link-access recording, anti-enumeration, CSRF,
forged-signature rejection, webhook dedup, rate limiting, and revocation/purge. The tests use the
in-memory store and a stub provider — **no real emails are sent and no provider account is needed.**

## Not verified here

Real email delivery and live webhook signatures require a configured Resend account, a verified
domain, and KV, which are not provisioned in this repo. Those paths are covered by unit tests with a
stub provider and locally-signed payloads, not by an end-to-end send.
