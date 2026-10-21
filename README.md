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

Nazar opens only from the calculator: type **`1947 =`**. A reload, a deep link or a cold start always lands on the calculator first.

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

All data is stored on the device with AsyncStorage (the browser's localStorage on web). Android backups are off (`allowBackup: false`). There is no server.

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
  store.tsx               persisted state (baits, email baits, events, checks, evidence, language)
  sample.ts               fictional, labelled sample records (never stored)
  view.ts                 merges real + sample records; summaries for Home, Exposure, Vault
  baitService.ts          optional email-bait service client (EXPO_PUBLIC_BAIT_API_URL)
  session.ts              in-memory unlock flag
  systemSettings.ts       Android system-settings shortcuts
  theme.ts                colour, type, spacing and radius tokens
```

## Known limits

- **Bluetooth scanning needs a native dev build and is unverified on hardware.** Real BLE scanning uses `react-native-ble-plx`, so it runs only in a development build — not in Expo Go or on the web, where the scan reports "unsupported" instead of inventing devices. The scan logic is covered by mocked tests but has **not yet been run against a real device**.
- **Email baits are unverified end-to-end.** They need the service described above (`EXPO_PUBLIC_BAIT_API_URL`); without it, sending is reported as not set up. The full send → inbox → link-open path has **not been confirmed with a live email provider**.
- A calculator decoy only sees what happens inside this calculator on this phone.
- The Digital Footprint Audit, Accounts Checks and Tracker Check are guided reviews: their results are what the user recorded, not independently verified findings.
- No real authentication or at-rest encryption yet. Unlock is a shared PIN held in memory, and on-device data is stored unencrypted.
