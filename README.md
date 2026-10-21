# Nazar

A covert women's-safety app for India. It hides inside an ordinary calculator and checks her own phone for digital surveillance (stalkerware, unknown Bluetooth trackers, new sign-ins). It catches snoopers with bait, keeps the evidence, and walks her through a safe plan in plain language.

Built with **Expo SDK 58 / React Native 0.88**, Expo Router, `react-native-svg`, Phosphor icons and Inter. The code implements the *Nazar Hero Screens v2* design.

## Run it

```bash
npm install
npx expo start          # press "a" for an Android emulator, or scan the QR code with Expo Go
npm run typecheck
npm run lint
```

To build an installable Android APK in the cloud, run `npx eas-cli@latest build -p android --profile preview` (this needs an Expo account).

**Web demo (Vercel):** `vercel.json` builds the web version with `npx expo export --platform web` into `dist/` and sends every route to `index.html`. Import the repo in Vercel and leave Framework Preset as "Other". In a desktop browser (600px wide or more) the app is shown inside a centred 412×892 phone frame (`src/components/DeviceFrame.tsx`) that shrinks to fit shorter laptop screens; on phones and narrow windows it runs full screen.

## How it works

Nazar opens only from the calculator. On a brand-new install, type the open code **`1947 =`** once to reveal the **Create your PIN** screen and choose a private PIN (4–12 digits). After that, unlock by typing **your PIN** on the calculator and pressing **`=`**. A reload, a deep link or a cold start always lands on the calculator first, and leaving Nazar clears the key from memory, so the PIN is needed again. A wrong PIN just shows a normal calculation, so the disguise never gives the app away.

| Screen | Route | What it really does |
|--------|-------|---------------------|
| Calculator (disguise) | `/` | A working stock-style calculator. History and the ⋮ menu hold any active calculator decoys. |
| Home | `/home` | Greeting, a compact "N of 3 checks look clear" summary, the Bait Test card (with loading, error, empty and ready states) and the Checks list. Every status comes from real records, or from labelled samples. |
| Accounts & Sessions | `/accounts`, `/account-check`, `/account-item`, `/session` | Accounts, Devices, Sharing and Checks tabs. The guided **Checks** are the real part: Nazar has no account access and never asks for passwords, so her answers are what she recorded, not verified findings. The Devices and Sharing tabs show labelled **sample** examples of what to look for — Nazar can't read a service's device or sharing list itself. |
| Digital Footprint Audit | `/digital-footprint-audit`, `/audit-module`, `/audit-report` | Guided checklist across Social, Location, Contact and Photo modules (replaces the old Quiet Check). The Photo module reads EXIF metadata from photos she picks, on-device, to flag embedded GPS coordinates. Findings and remediation steps she records are kept; a shareable report includes her own records only. |
| Tracker Check | `/tracker`, `/tracker-detail`, `/ble-scan` | A guided workflow for the phone's own unknown-tracker scan, with results recorded by her. A built-in Bluetooth scan (`/ble-scan`) is also available, but only in a native development build with the BLE module — on the web and in Expo Go it reports that it is unsupported rather than inventing devices (see Known limits). |
| Bait Test | `/bait`, `/bait-new`, `/bait-detail` | **Email baits:** a test name, her own address (confirmed as hers), one of four unbranded templates, a preview, and an explicit confirmation before sending. Sending works only when a service is configured (see below); otherwise it honestly reports that it isn't set up. **Calculator decoys:** these really work on the device. Each bait has an activity timeline. "Review event" asks "Was this you?", and "No" offers to save the event to the Vault, after another confirmation. |
| Exposure | `/exposure` | Five categories plus a findings list, built from real records and labelled samples, with filters. |
| Vault | `/vault`, `/vault-add`, `/evidence` | Saved and pending-review records, category filters, newest/oldest sorting, detail pages with timestamps, source and editable review notes, a form to add a record by hand, a downloadable export and a dated text summary to share — both of which exclude sample records so demo data can never be presented as genuine evidence. |
| Plan | `/plan` | Progress bar, next step, and the safe-order steps with Safe / May notice pills. Her ticks are saved. |

Every page shares the new Home design language: a lavender-to-cream wash, 22px cards with soft shadows, Checks-style list cards, stat tiles, the EN | हिं switch, a solid Exit button with a "Leave Nazar now?" sheet, and 46px helpline buttons.

### Sample data

The app ships with fictional sample records (`src/sample.ts`) so it can be demonstrated without empty screens. They are never written to storage. Every sample item shows a dashed **Sample** badge, and each page has a "Hide samples" switch. Samples can't be changed, reviewed for real, or saved as evidence. Once she records something real, Home shows her data instead of the sample.

### Email baits need a service

Nazar has no server of its own. Without one, sending an email bait honestly reports **"Not sent: email sending isn't set up"**: no email is sent, no link exists, and no link events can be recorded. To connect a service, set `EXPO_PUBLIC_BAIT_API_URL` at build time. The service must implement:

```
POST {url}/baits                 { recipient, template, name, subject, body }  -> { id }
GET  {url}/baits/{id}/events                                                  -> [{ id, at, detail? }]
```

The service should send the email to the given address with a unique link, serve a blank page at that link, and record each open. Templates name no real company and never ask for a password. The UI only allows sending to an address she confirms is her own.

### Security of what's stored

Everything Nazar saves is kept on the device only (AsyncStorage; the browser's localStorage on web) — there is no server and no cloud upload — and the whole data blob is **encrypted at rest**:

- The data is sealed with **AES-256-GCM** under a random data key. That key is wrapped under a key derived from the user's **PIN** with **scrypt** (memory-hard) and a random salt. The PIN is never stored — a wrong PIN simply fails the GCM auth tag, which is the unlock check. Crypto is pure-JS (`@noble/ciphers` + `@noble/hashes`), so it runs identically on web, native and in the unit tests (`crypto/vaultCrypto.ts`).
- **Retry protection:** consecutive wrong PINs trigger an escalating lockout (`crypto/lockout.ts`), on top of the deliberately slow scrypt cost per attempt.
- Two things stay in plaintext so the calculator can still catch a snoop **before** unlock, and both are non-evidence by design: the **decoy definitions** (fake bait labels), and a small **pending buffer** of decoy-opens captured while locked, which is folded into the encrypted vault (and wiped) on the next unlock.

**This is real encryption, not a security theatre PIN screen — but read the honest limits below before relying on it.** In particular, a hardware-keystore pepper (which would stop offline brute force of a short PIN) still needs a native build and is **not active yet**; until then, prefer a longer PIN. Android backups are off (`allowBackup: false`).

**Languages:** English and हिन्दी. Switch from the header on every screen. The choice is saved. Strings live in `src/i18n/en.ts` and `src/i18n/hi.ts`; TypeScript fails the build if a Hindi string is missing. The calculator disguise intentionally stays in English, like a stock calculator.

Safety behaviours on every unlocked screen:

- **Exit** (top right) asks "Leave Nazar now?", then goes straight back to the calculator, which locks Nazar again.
- If the app is sent to the background, it returns to the calculator.
- **181 Women Helpline** and **112 Emergency** open the phone's dialer.
- No user name, no notification bell, and no notifications.
- On the launcher, the app is named "Calculator", with a plain calculator icon and a neutral package id (`com.simplecalc.app`).

## Layout

```
src/
  app/
    _layout.tsx           root stack, fonts, store
    index.tsx             calculator disguise (+ bait decoys)
    (nazar)/              tabs: home, exposure, vault, plan + detail pages
  components/             Screen shell, headers, language toggle, cards, buttons, DeviceFrame
  content/                account-check and Digital Footprint Audit catalogues, bait content
  ble/                    real Bluetooth scan (native dev build only; unsupported on web/Expo Go)
  exif.ts, exifReader.ts  on-device photo EXIF/GPS reading for the Photo audit module
  i18n/                   en.ts, hi.ts, useT() with date/time formatting
  store.tsx               persisted state; PIN-encrypted vault + plaintext decoy/pending tiers
  crypto/                 vaultCrypto (AES-GCM + scrypt), lockout, device-pepper seam, RNG
  sample.ts               fictional, labelled sample records (never stored)
  view.ts                 merges real + sample records; summaries for Home, Exposure, Vault
  baitService.ts          optional email-bait service client (EXPO_PUBLIC_BAIT_API_URL)
  session.ts              in-memory navigation-unlock flag (the key/data live in the store)
  systemSettings.ts       Android system-settings shortcuts
  theme.ts                colour, type, spacing and radius tokens
```

## Known limits

- **Bluetooth scanning needs a native dev build and is unverified on hardware.** Real BLE scanning uses `react-native-ble-plx`, so it runs only in a development build — not in Expo Go or on the web, where the scan reports "unsupported" instead of inventing devices. The scan logic is covered by mocked tests but has **not yet been run against a real device**.
- **Email baits — what's verified vs. not.** The backend *logic* (create, honest "not set up", owner-scoping, CSRF, link-open recording, webhook signature + idempotency, rate limits, delete) is covered by mocked unit tests. **Not** verified, because they need live credentials/infrastructure this environment can't reach (`api.resend.com` is blocked by network policy): real **provider acceptance** (a live Resend API key + verified sender), **inbox delivery** (Resend delivering + the `email.delivered` webhook), and **durable storage** (Vercel KV). Provider acceptance, inbox delivery and link-open recording are distinct steps — none of the live ones has been confirmed end-to-end.
- **Encryption at rest, honest limits.** (1) A short numeric PIN has a small keyspace; anyone who copies the encrypted blob off the device can try every PIN **offline**, slowed only by scrypt. The fix is a hardware-keystore pepper (`crypto/deviceSecret.ts`), which needs a native dev build with `expo-secure-store` and is **not active yet** — so prefer a longer PIN for now. (2) Decoy-opens captured **while locked** sit in a plaintext buffer until the next unlock folds them into the vault; closing that window needs public-key sealed captures. (3) **Exported files are not encrypted** — the Vault download is plain text (the app warns before downloading); the data is only encrypted *inside* Nazar.
- A calculator decoy only sees what happens inside this calculator on this phone.
- The Digital Footprint Audit, Accounts Checks and Tracker Check are guided reviews: their results are what the user recorded, not independently verified findings.
