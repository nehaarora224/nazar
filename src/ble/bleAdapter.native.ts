import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager, State } from 'react-native-ble-plx';

import type { BleAdapter, BleAvailability, PermissionResult } from './types';

// Real BLE adapter backed by react-native-ble-plx. This file is only bundled on iOS/Android.
// It needs a development build (not Expo Go, which lacks the native module) — handled by the UI
// surfacing a scan_failed/unsupported state if the module cannot load.

let managerPromise: Promise<BleManager> | null = null;
async function getManager(): Promise<BleManager> {
  if (!managerPromise) {
    managerPromise = import('react-native-ble-plx').then(({ BleManager }) => new BleManager());
  }
  return managerPromise;
}

function mapState(state: State): BleAvailability {
  switch (state) {
    case 'PoweredOn':
      return 'ready';
    case 'PoweredOff':
      return 'poweredOff';
    case 'Unauthorized':
      return 'unauthorized';
    case 'Unsupported':
      return 'unsupported';
    default:
      return 'unknown';
  }
}

export const bleAdapter: BleAdapter = {
  supported: true,

  async availability() {
    try {
      const m = await getManager();
      return mapState(await m.state());
    } catch {
      // Native module missing (e.g. Expo Go) — treat as unsupported rather than pretend.
      return 'unsupported';
    }
  },

  async requestPermissions(): Promise<PermissionResult> {
    // iOS has no runtime request API; the OS prompts on first scan and availability() catches denial.
    if (Platform.OS !== 'android') return 'granted';

    const api = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
    const perms =
      api >= 31
        ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

    try {
      const res = await PermissionsAndroid.requestMultiple(perms);
      const values = Object.values(res);
      if (values.every((v) => v === PermissionsAndroid.RESULTS.GRANTED)) return 'granted';
      if (values.some((v) => v === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) return 'blocked';
      return 'denied';
    } catch {
      return 'denied';
    }
  },

  async startScan(onSeen) {
    const m = await getManager();
    m.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
      if (error || !device) return;
      onSeen({
        id: device.id,
        name: device.name ?? device.localName ?? undefined,
        rssi: device.rssi ?? undefined,
        serviceUuids: device.serviceUUIDs ?? undefined,
        manufacturerData: device.manufacturerData ?? undefined,
      });
    });
  },

  async stopScan() {
    try {
      const m = await getManager();
      m.stopDeviceScan();
    } catch {
      // manager not created; nothing to stop
    }
  },

  destroy() {
    if (managerPromise) {
      managerPromise.then((m) => m.destroy()).catch(() => undefined);
      managerPromise = null;
    }
  },
};
