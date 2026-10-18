# Nazar

A covert women's-safety app for India. It hides inside an ordinary calculator and checks her own phone for digital surveillance (stalkerware, unknown Bluetooth trackers, new sign-ins). It catches snoopers with bait, keeps the evidence, and walks her through a safe plan in plain language.

Built with **Expo SDK 58 / React Native 0.88**, Expo Router, `react-native-svg`, Phosphor icons and Inter. The code implements the *Nazar Hero Screens v2* design.

## Run it

```bash
npm install
npx expo start          # press "a" for an Android emulator, or scan the QR code with Expo Go
npm run typecheck
```

To build an installable Android APK in the cloud, run `npx eas-cli@latest build -p android --profile preview` (this needs an Expo account).

**Web demo (Vercel):** `vercel.json` builds the web version with `npx expo export --platform web` into `dist/` and sends every route to `index.html`. Import the repo in Vercel and leave Framework Preset as "Other". In a desktop browser (600px wide or more) the app is shown inside a centred 412×892 phone frame (`src/components/DeviceFrame.tsx`) that shrinks to fit shorter laptop screens; on phones and narrow windows it runs full screen.

## How it works

Nazar opens only from the calculator: type **`1947 =`**. A reload, a deep link or a cold start always lands on the calculator first.

| Screen | Route | What it really does |
|--------|-------|---------------------|
| Calculator (disguise) | `/` | A working stock-style calculator. History and the ⋮ menu hold any active baits. |
| Home | `/home` | Hub for the three tools and the Bait Test widget. Every status comes from what has actually been recorded. There are no scores. |
| Accounts & Sessions | `/accounts`, `/account-check`, `/account-item` | 10 guided checks (Google, WhatsApp, Apple, Instagram/Facebook, Telegram, location sharing, recovery info, family groups). Nazar has no account access and never asks for passwords. You record what you saw. |
| Quiet Check | `/quiet-check` | Guided microphone, camera and location review. Android opens the system privacy and location settings. Your observations are kept as a timeline. Other apps' permissions are shown as "Unknown", because the OS doesn't expose them. |
| Tracker Check | `/tracker`, `/tracker-detail` | A guided workflow around the phone's own unknown-tracker scan, with results recorded by you and the history kept. Nazar does not scan Bluetooth itself in this version. |
| Bait Test | `/bait`, `/bait-new`, `/bait-detail` | Decoys hidden in the calculator's history or ⋮ menu. Opening one inside the app records the real time and how long it stayed open. It can't identify who opened it or detect remote access. |
| Exposure | `/exposure` | What someone might see, derived only from completed checks. Unchecked areas say "Not checked yet". |
| Vault | `/vault` | Only items you chose to save. You can filter them, remove them, or share a dated text summary. |
| Plan | `/plan` | Safe-order steps, each with a Safe / May notice pill. Ticks are saved. |

All data is stored on the device with AsyncStorage (the browser's localStorage on web). Android backups are off (`allowBackup: false`). There is no server.

**Languages:** English and हिन्दी. Switch from the header on Home, Exposure, Vault and Plan. The choice is saved. Strings live in `src/i18n/en.ts` and `src/i18n/hi.ts`; TypeScript fails the build if a Hindi string is missing. The calculator disguise intentionally stays in English, like a stock calculator.

Safety behaviours on every unlocked screen:

- **Exit** (top right) jumps straight back to the calculator, which locks Nazar again.
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
  store.tsx               persisted state (baits, events, checks, evidence, language)
  derive.ts               summaries shared by Home, Exposure and the tool pages
  session.ts              in-memory unlock flag
  systemSettings.ts       Android system-settings shortcuts
  theme.ts                colour, type, spacing and radius tokens
```

## Known limits

- No Bluetooth scanning. Real BLE scanning needs a native module (for example `react-native-ble-plx`) and a development build. It won't run in Expo Go or on the web.
- A bait only sees what happens inside this calculator on this phone.
- Quiet Check and Accounts are guided reviews. Their results are what the user recorded, not verified findings.
