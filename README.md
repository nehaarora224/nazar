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
| Accounts & Sessions | `/accounts`, `/account-check`, `/account-item`, `/session` | Accounts, Devices, Sharing and Checks tabs. The 10 guided checks are the real part: Nazar has no account access and never asks for passwords. Devices she records as unfamiliar appear in the Devices tab. |
| Quiet Check | `/quiet-check` | Guided microphone, camera and location review. Android opens the system privacy and location settings. Her observations are kept as a timeline. |
| Tracker Check | `/tracker`, `/tracker-detail` | A guided workflow around the phone's own unknown-tracker scan, with results recorded by her. Nazar does not scan Bluetooth itself. |
| Bait Test | `/bait`, `/bait-new`, `/bait-detail` | **Email baits:** a test name, her own address (confirmed as hers), one of four unbranded templates, a preview, and an explicit confirmation before sending. **Calculator decoys:** these really work on the device. Each bait has an activity timeline. "Review event" asks "Was this you?", and "No" offers to save the event to the Vault, after another confirmation. |
| Exposure | `/exposure` | Five categories plus a findings list, built from real records and labelled samples, with filters. |
| Vault | `/vault`, `/evidence` | Saved and pending-review records, category filters, newest/oldest sorting, detail pages with timestamps, source and editable review notes, and a dated text summary to share (real records only). |
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
  content/                account-check catalogue, bait icons
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

- No Bluetooth scanning. Real BLE scanning needs a native module (for example `react-native-ble-plx`) and a development build. It won't run in Expo Go or on the web.
- A calculator decoy only sees what happens inside this calculator on this phone. Email baits need the service described above.
- Quiet Check and Accounts are guided reviews. Their results are what the user recorded, not verified findings.
