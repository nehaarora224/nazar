import assert from 'node:assert/strict';
import { test } from 'node:test';

import { summarize, packageOf, type RawAudit } from '../modules/permission-audit/model.ts';

const base: RawAudit = {
  platform: 'android',
  androidSdkInt: 34,
  appId: 'com.simplecalc.app',
  selfPermissions: [],
  developerOptionsEnabled: false,
  adbEnabled: false,
  enabledAccessibilityServices: [],
  enabledNotificationListeners: [],
  activeDeviceAdmins: [],
  canDrawOverlaysSelf: false,
};

test('maps the app’s own granted permissions by Android name suffix', () => {
  const s = summarize({
    ...base,
    selfPermissions: [
      { name: 'android.permission.CAMERA', granted: true },
      { name: 'android.permission.RECORD_AUDIO', granted: false },
      { name: 'android.permission.ACCESS_COARSE_LOCATION', granted: true },
    ],
  });
  assert.equal(s.self.camera, true);
  assert.equal(s.self.microphone, false); // requested but not granted
  assert.equal(s.self.location, true); // coarse counts as location
  assert.equal(s.self.overlay, false);
});

test('a non-empty service list is a review signal; an empty one is not', () => {
  const s = summarize({ ...base, enabledAccessibilityServices: ['com.x/.A11y', 'com.y/.Svc'] });
  const a11y = s.signals.find((x) => x.key === 'accessibility')!;
  assert.deepEqual(a11y.entries, ['com.x/.A11y', 'com.y/.Svc']);
  assert.equal(a11y.present, true);
  assert.equal(a11y.review, true);
  const admins = s.signals.find((x) => x.key === 'deviceAdmins')!;
  assert.equal(admins.present, false);
  assert.equal(admins.review, false);
});

test('flag signals: on → review, off → not, null → unknown (never review)', () => {
  const on = summarize({ ...base, developerOptionsEnabled: true });
  assert.equal(on.signals.find((x) => x.key === 'developerOptions')!.review, true);
  const unknown = summarize({ ...base, adbEnabled: null });
  const adb = unknown.signals.find((x) => x.key === 'adb')!;
  assert.equal(adb.present, null);
  assert.equal(adb.review, false);
});

test('reviewCount sums only the signals worth attention', () => {
  const s = summarize({
    ...base,
    enabledAccessibilityServices: ['com.x/.A11y'], // review
    enabledNotificationListeners: [], // no
    activeDeviceAdmins: ['com.z/.Admin'], // review
    developerOptionsEnabled: true, // review
    adbEnabled: false, // no
  });
  assert.equal(s.reviewCount, 3);
});

test('packageOf shortens a flattened component to its package', () => {
  assert.equal(packageOf('com.example.app/.MyService'), 'com.example.app');
  assert.equal(packageOf('com.example.app/com.example.app.Svc'), 'com.example.app');
  assert.equal(packageOf('bare.package.name'), 'bare.package.name');
});
