import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import type { RawAudit } from './model';

export type { RawAudit, SelfPermission, AuditSummary, Signal, SignalKey } from './model';
export { summarize, packageOf } from './model';

type NativePermissionAudit = {
  isAvailable(): boolean;
  getAudit(): Promise<RawAudit>;
};

// Null on web and in Expo Go (the native module isn't present there) — the UI shows an honest
// "needs the installed app" fallback instead, exactly like the Bluetooth scan.
const Native = requireOptionalNativeModule<NativePermissionAudit>('PermissionAudit');

/** True only in a native build that actually bundled this module (Android dev/preview/production). */
export function isPermissionAuditAvailable(): boolean {
  return Platform.OS === 'android' && Native != null && Native.isAvailable();
}

/** Run the read-only audit. Throws if called when unavailable — callers should gate on isPermissionAuditAvailable(). */
export async function getPermissionAudit(): Promise<RawAudit> {
  if (!Native) throw new Error('PermissionAudit native module is not available on this platform');
  return Native.getAudit();
}
