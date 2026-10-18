// Types shared by the Bluetooth scan adapters. No platform imports here so this file is safe to
// load anywhere (web export, Node tests, native).

/** A single advertisement as the platform reports it. Only fields the OS actually exposes. */
export type RawSeen = {
  /** Opaque platform device id (a random UUID on iOS; a MAC-like id on Android). */
  id: string;
  name?: string;
  rssi?: number;
  serviceUuids?: string[];
  /** Base64 manufacturer-specific data, as react-native-ble-plx returns it. */
  manufacturerData?: string;
};

/** A device as accumulated across sightings during one scan. In memory only unless saved. */
export type BleDevice = {
  id: string;
  name?: string;
  rssi?: number;
  serviceUuids?: string[];
  /** Decoded company name from the manufacturer id, when it is one we recognise. */
  manufacturerName?: string;
  firstSeen: number;
  lastSeen: number;
  /** How many advertisements we saw from this id — repeated sightings are meaningful. */
  sightings: number;
};

export type BleAvailability = 'unsupported' | 'unknown' | 'poweredOff' | 'unauthorized' | 'ready';

/** Result of asking for the OS permissions a scan needs. "blocked" = permanently denied. */
export type PermissionResult = 'granted' | 'denied' | 'blocked' | 'unsupported';

export interface BleAdapter {
  /** False on web/Expo Go, where no real BLE scan is possible. */
  readonly supported: boolean;
  availability(): Promise<BleAvailability>;
  requestPermissions(): Promise<PermissionResult>;
  /** Begin scanning; `onSeen` fires for every advertisement. Call stopScan to end. */
  startScan(onSeen: (raw: RawSeen) => void): Promise<void>;
  stopScan(): Promise<void>;
  destroy(): void;
}
