import type { BleAdapter } from './types';

// Default adapter (web and any platform without the native BLE module). A real scan is impossible
// here, so it reports unsupported honestly and never invents devices. The native build uses
// bleAdapter.native.ts instead (Metro resolves the .native.ts file on iOS/Android).
export const bleAdapter: BleAdapter = {
  supported: false,
  async availability() {
    return 'unsupported';
  },
  async requestPermissions() {
    return 'unsupported';
  },
  async startScan() {
    throw new Error('Bluetooth scanning is not supported here');
  },
  async stopScan() {
    // nothing to stop
  },
  destroy() {
    // nothing to dispose
  },
};
