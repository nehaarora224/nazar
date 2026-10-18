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

| # | Screen | Route | What you can do |
|---|--------|-------|-----------------|
| 01 | The Disguise | `/` | A working stock-style calculator. Type **`1947 =`** to open Nazar. |
| 02 | Safety Dashboard | `/home` | **Check my phone** runs a check. Tap a tile to open its detail screen. Long-press the ring to cycle the safe / review / alert states (for demos). |
| 03 | What can they see? | `/exposure` | Exposures listed most important first. Movement and Location open the tracker screen. |
| 04 | Tracker following you | `/tracker` | The tracker's path for the day. **Find it** steps the signal meter. |
| 05 | Someone took the bait | `/bait` | The catch card opens the Vault. |
| 06 | Evidence Vault | `/vault` | Filter chips filter the timeline. |
| 07 | Safe Order Action Plan | `/plan` | Tap a step to tick it. Stages complete in order. |

Safety behaviours on every unlocked screen:

- **Quick exit** (top right) jumps straight back to the calculator.
- If the app is sent to the background, it returns to the calculator.
- **181 Women Helpline** and **112 Emergency** open the phone's dialer.
- No user name, no notification bell, and no notifications.
- On the launcher, the app is named "Calculator", with a plain calculator icon and a neutral package id (`com.simplecalc.app`).

## Layout

```
src/
  app/
    _layout.tsx         root stack, fonts, state provider
    index.tsx           01 calculator (the disguise)
    (nazar)/
      _layout.tsx       tabs + custom tab bar, background → calculator
      home.tsx          02   exposure.tsx 03   tracker.tsx 04
      bait.tsx          05   vault.tsx    06   plan.tsx    07
  components/           Screen shell, app bar, pills, buttons, tab bar, logo
  calc.ts               expression evaluator (Hermes has no eval)
  state.tsx             dashboard state + plan progress
  theme.ts              colour, type and shadow tokens from the design
```

All data on these screens is sample data for the pitch. Scanning, bait capture and evidence export are not wired to real device APIs yet.
