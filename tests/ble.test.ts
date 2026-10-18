// BLE scan-session logic, tested with a mocked adapter. These are NOT real-device checks: no
// Bluetooth hardware is touched. Real scanning must be verified on a physical dev build.
//   node --test --experimental-strip-types tests/ble.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { applySeen, companyName, ScanController, sortedDevices } from '../src/ble/scan.ts';
import type { BleAdapter, BleAvailability, PermissionResult, RawSeen } from '../src/ble/types.ts';

/** A controllable fake adapter: the test decides availability, permission, and what it "sees". */
function mockAdapter(opts: {
  supported?: boolean;
  availability?: BleAvailability;
  permission?: PermissionResult;
  emit?: RawSeen[];
  failStart?: boolean;
}): BleAdapter & { stopped: boolean } {
  return {
    supported: opts.supported ?? true,
    stopped: false,
    async availability() {
      return opts.availability ?? 'ready';
    },
    async requestPermissions() {
      return opts.permission ?? 'granted';
    },
    async startScan(onSeen) {
      if (opts.failStart) throw new Error('boom');
      for (const raw of opts.emit ?? []) onSeen(raw);
    },
    async stopScan() {
      this.stopped = true;
    },
    destroy() {},
  };
}

const makeCtrl = (adapter: BleAdapter) => {
  let changes = 0;
  const c = new ScanController(adapter, { durationMs: 60_000, onChange: () => changes++, now: () => 1000 });
  return c;
};

test('companyName decodes a known manufacturer id', () => {
  // Apple = 0x004C, little-endian bytes [0x4C, 0x00]; base64 of those two bytes:
  const b64 = Buffer.from([0x4c, 0x00]).toString('base64');
  assert.equal(companyName(b64), 'Apple');
  assert.equal(companyName(undefined), undefined);
  assert.equal(companyName(Buffer.from([0xff, 0xff]).toString('base64')), undefined);
});

test('applySeen deduplicates by id and counts sightings', () => {
  const m = new Map();
  applySeen(m, { id: 'a', rssi: -40 }, 1000);
  applySeen(m, { id: 'a', rssi: -50 }, 1500);
  applySeen(m, { id: 'b', name: 'Tag' }, 1600);
  assert.equal(m.size, 2);
  assert.equal(m.get('a').sightings, 2);
  assert.equal(m.get('a').rssi, -50); // latest rssi wins
  assert.equal(m.get('a').firstSeen, 1000);
  assert.equal(m.get('a').lastSeen, 1500);
  const sorted = sortedDevices(m);
  assert.equal(sorted[0].id, 'b'); // most recently seen first
});

test('a successful scan collects deduped devices then stops', async () => {
  const adapter = mockAdapter({ emit: [{ id: 'x', rssi: -30 }, { id: 'x', rssi: -35 }, { id: 'y' }] });
  const c = makeCtrl(adapter);
  await c.start();
  assert.equal(c.phase, 'scanning');
  assert.equal(c.devices.size, 2);
  assert.equal(c.devices.get('x').sightings, 2);
  await c.stop();
  assert.equal(c.phase, 'done');
  assert.equal(adapter.stopped, true);
});

test('unsupported adapter reports an error and never scans', async () => {
  const c = makeCtrl(mockAdapter({ supported: false }));
  await c.start();
  assert.equal(c.phase, 'error');
  assert.equal(c.error, 'unsupported');
});

test('bluetooth off surfaces as poweredOff', async () => {
  const c = makeCtrl(mockAdapter({ availability: 'poweredOff' }));
  await c.start();
  assert.equal(c.error, 'poweredOff');
});

test('denied and blocked permissions are distinct', async () => {
  const denied = makeCtrl(mockAdapter({ permission: 'denied' }));
  await denied.start();
  assert.equal(denied.error, 'denied');

  const blocked = makeCtrl(mockAdapter({ permission: 'blocked' }));
  await blocked.start();
  assert.equal(blocked.error, 'blocked');
});

test('a failing startScan is reported, not swallowed as success', async () => {
  const c = makeCtrl(mockAdapter({ failStart: true }));
  await c.start();
  assert.equal(c.phase, 'error');
  assert.equal(c.error, 'scan_failed');
});
