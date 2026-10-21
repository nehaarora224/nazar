/**
 * Pure shaping of the native audit result. No native imports, so it is unit-testable in Node and
 * shared by the screen. It only *organizes* what Android returned — it never infers spying.
 */

export type SelfPermission = { name: string; granted: boolean };

/** Exactly what the Kotlin module returns (all fields may be null/empty if Android wouldn't say). */
export type RawAudit = {
  platform: 'android';
  androidSdkInt: number;
  appId: string;
  selfPermissions: SelfPermission[];
  developerOptionsEnabled: boolean | null;
  adbEnabled: boolean | null;
  enabledAccessibilityServices: string[];
  enabledNotificationListeners: string[];
  activeDeviceAdmins: string[];
  canDrawOverlaysSelf: boolean | null;
};

/** Short key for each "worth a look" signal, so the UI can label/sort without re-deriving. */
export type SignalKey = 'accessibility' | 'notificationListeners' | 'deviceAdmins' | 'developerOptions' | 'adb';

export type Signal = {
  key: SignalKey;
  /** The component strings Android listed (for the two lists), else an empty array. */
  entries: string[];
  /** For the boolean flags: true/false/null(unknown). For list signals: whether the list is non-empty. */
  present: boolean | null;
  /** True when this is worth the user's attention (a non-empty list, or an enabled debug flag). */
  review: boolean;
};

export type AuditSummary = {
  appId: string;
  androidSdkInt: number;
  /** Nazar's own sensitive permissions and whether they're granted (directly verified). */
  self: { camera: boolean; microphone: boolean; location: boolean; overlay: boolean | null };
  signals: Signal[];
  /** How many signals are worth reviewing — never a count of "spyware". */
  reviewCount: number;
};

const has = (perms: SelfPermission[], suffix: string) =>
  perms.some((p) => p.granted && p.name.endsWith(suffix));

/** Turn the raw native result into the summary the screen renders. Pure. */
export function summarize(raw: RawAudit): AuditSummary {
  const listSignal = (key: SignalKey, entries: string[]): Signal => ({
    key,
    entries,
    present: entries.length > 0,
    review: entries.length > 0,
  });
  const flagSignal = (key: SignalKey, present: boolean | null): Signal => ({
    key,
    entries: [],
    present,
    review: present === true,
  });

  const signals: Signal[] = [
    listSignal('accessibility', raw.enabledAccessibilityServices),
    listSignal('notificationListeners', raw.enabledNotificationListeners),
    listSignal('deviceAdmins', raw.activeDeviceAdmins),
    flagSignal('developerOptions', raw.developerOptionsEnabled),
    flagSignal('adb', raw.adbEnabled),
  ];

  return {
    appId: raw.appId,
    androidSdkInt: raw.androidSdkInt,
    self: {
      // Match by Android permission name suffix so this is independent of the full constant string.
      camera: has(raw.selfPermissions, 'permission.CAMERA'),
      microphone: has(raw.selfPermissions, 'permission.RECORD_AUDIO'),
      location:
        has(raw.selfPermissions, 'permission.ACCESS_FINE_LOCATION') ||
        has(raw.selfPermissions, 'permission.ACCESS_COARSE_LOCATION'),
      overlay: raw.canDrawOverlaysSelf,
    },
    signals,
    reviewCount: signals.filter((s) => s.review).length,
  };
}

/** Shorten a flattened component name (pkg/.Service) to just its package, for display. */
export function packageOf(component: string): string {
  const slash = component.indexOf('/');
  return slash > 0 ? component.slice(0, slash) : component;
}
