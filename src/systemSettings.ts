import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

/** Which system screens Nazar can open. Only Android exposes public intents for these. */
export const canOpenSystemSettings = Platform.OS === 'android';

const ACTIONS = {
  privacy: [IntentLauncher.ActivityAction.PRIVACY_SETTINGS, IntentLauncher.ActivityAction.SETTINGS],
  location: [IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS, IntentLauncher.ActivityAction.SETTINGS],
  settings: [IntentLauncher.ActivityAction.SETTINGS],
} as const;

/** Opens the closest available system screen, falling back to the main Settings app. */
export async function openSystemSettings(kind: keyof typeof ACTIONS) {
  if (!canOpenSystemSettings) return false;
  for (const action of ACTIONS[kind]) {
    try {
      await IntentLauncher.startActivityAsync(action);
      return true;
    } catch {
      // Not available on this phone; try the next one.
    }
  }
  return false;
}

export type PlatformKind = 'android' | 'ios' | 'web';
export const platformKind: PlatformKind = Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web';
