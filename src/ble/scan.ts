import type { BleAdapter, BleDevice, RawSeen } from './types';

// Pure scan-session logic: merging advertisements into deduplicated devices, and decoding the
// handful of manufacturer ids worth naming. No React or platform code, so it is unit-testable.

/** A few Bluetooth SIG company identifiers. We name only these; everything else stays generic. */
const COMPANIES: Record<number, string> = {
  0x004c: 'Apple',
  0x0075: 'Samsung',
  0x00e0: 'Google',
  0x0006: 'Microsoft',
  0x00d2: 'Tile',
};

/** Decode the company name from base64 manufacturer data (first two bytes, little-endian). */
export function companyName(manufacturerData?: string): string | undefined {
  if (!manufacturerData) return undefined;
  try {
    // atob is available in Hermes, on web, and in Node 22 — no Buffer needed.
    const bin = atob(manufacturerData);
    if (bin.length < 2) return undefined;
    const id = bin.charCodeAt(0) | (bin.charCodeAt(1) << 8);
    return COMPANIES[id];
  } catch {
    return undefined;
  }
}

/**
 * Merge one advertisement into the running device map. Updates lastSeen/sightings/rssi for a known
 * id, or inserts a new device. Mutates and returns the map so a caller can snapshot it.
 */
export function applySeen(devices: Map<string, BleDevice>, raw: RawSeen, now: number): Map<string, BleDevice> {
  const existing = devices.get(raw.id);
  if (existing) {
    existing.lastSeen = now;
    existing.sightings += 1;
    if (raw.rssi != null) existing.rssi = raw.rssi;
    if (raw.name && !existing.name) existing.name = raw.name;
    if (raw.serviceUuids?.length) existing.serviceUuids = raw.serviceUuids;
    const mfr = companyName(raw.manufacturerData);
    if (mfr && !existing.manufacturerName) existing.manufacturerName = mfr;
  } else {
    devices.set(raw.id, {
      id: raw.id,
      name: raw.name,
      rssi: raw.rssi,
      serviceUuids: raw.serviceUuids,
      manufacturerName: companyName(raw.manufacturerData),
      firstSeen: now,
      lastSeen: now,
      sightings: 1,
    });
  }
  return devices;
}

/** Devices sorted for display: most-recently-seen first. */
export function sortedDevices(devices: Map<string, BleDevice>): BleDevice[] {
  return [...devices.values()].sort((a, b) => b.lastSeen - a.lastSeen);
}

export type ScanPhase = 'idle' | 'checking' | 'scanning' | 'done' | 'error';
/** Why a scan could not run or ended early. Mirrors availability/permission outcomes. */
export type ScanError = 'unsupported' | 'poweredOff' | 'unauthorized' | 'unknown' | 'denied' | 'blocked' | 'scan_failed';

/**
 * Drives one time-limited scan: availability -> permission -> scan -> auto-stop. Framework-free so
 * it can be unit-tested with a mock adapter; the React hook just mirrors its state on each change.
 * Results live only in `devices` and are never persisted unless the user chooses to save one.
 */
export class ScanController {
  phase: ScanPhase = 'idle';
  error?: ScanError;
  readonly devices = new Map<string, BleDevice>();
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private adapter: BleAdapter,
    private opts: { durationMs: number; onChange: () => void; now?: () => number },
  ) {}

  private now() {
    return (this.opts.now ?? Date.now)();
  }
  private to(phase: ScanPhase, error?: ScanError) {
    this.phase = phase;
    this.error = error;
    this.opts.onChange();
  }

  async start(): Promise<void> {
    if (!this.adapter.supported) return this.to('error', 'unsupported');
    this.devices.clear();
    this.to('checking');

    const avail = await this.adapter.availability();
    if (avail === 'poweredOff' || avail === 'unauthorized' || avail === 'unsupported') return this.to('error', avail);
    if (avail !== 'ready') return this.to('error', 'unknown');

    const perm = await this.adapter.requestPermissions();
    if (perm === 'denied' || perm === 'blocked' || perm === 'unsupported') {
      return this.to('error', perm === 'unsupported' ? 'unsupported' : perm);
    }

    try {
      await this.adapter.startScan((raw) => {
        applySeen(this.devices, raw, this.now());
        this.opts.onChange();
      });
    } catch {
      return this.to('error', 'scan_failed');
    }
    this.to('scanning');
    this.timer = setTimeout(() => void this.stop(), this.opts.durationMs);
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.phase === 'scanning' || this.phase === 'checking') {
      try {
        await this.adapter.stopScan();
      } catch {
        // Nothing actionable if the platform fails to stop; we still leave the scanning state.
      }
      this.to('done');
    }
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    try {
      this.adapter.destroy();
    } catch {
      // ignore
    }
  }
}
