import type {
  AuditFinding,
  AuditItemState,
  AuditModuleId,
  BaitEvent,
  EmailBait,
  EventReview,
  Evidence,
  LinkEvent,
  QuietEntry,
  RemediationAction,
  TemplateId,
  TrackerEntry,
} from './store';

/**
 * Fictional sample records so the app can be demonstrated without empty screens.
 * Nothing here is ever written to storage, and every item carries `sample: true` so the UI
 * labels it. None of it describes a real account, device, scan, email or event.
 */

export type Sampled = { sample?: true };

export type AccountKind = 'email' | 'chat' | 'social' | 'cloud';
export type SampleAccount = { id: string; service: string; account: string; kind: AccountKind; status: 'review' | 'ok'; checkedAt: number; checkId: string };
export type SessionStatus = 'unfamiliar' | 'recognised' | 'current';
export type SampleSession = {
  id: string;
  accountId: string;
  service: string;
  device: string;
  place: string;
  lastActive: number;
  status: SessionStatus;
  kind: 'device' | 'session';
  checkId: string;
};
export type SharingStatus = 'review' | 'ok';
export type SampleSharing = { id: string; service: string; setting: 'location' | 'liveLocation' | 'recovery' | 'family'; value: string; status: SharingStatus; checkId: string };
export type PendingSample = { id: string; kind: Evidence['kind']; title: string; at: number; source: string; ref: string };

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function buildSample(now = Date.now()) {
  const ago = (ms: number) => now - ms;

  const accounts: (SampleAccount & Sampled)[] = [
    { id: 's-acc-google', service: 'Google', account: 'priya.s••••@example.com', kind: 'email', status: 'review', checkedAt: ago(2 * HOUR), checkId: 'google_devices', sample: true },
    { id: 's-acc-whatsapp', service: 'WhatsApp', account: '+91 ••••• ••417', kind: 'chat', status: 'review', checkedAt: ago(3 * HOUR), checkId: 'whatsapp_linked', sample: true },
    { id: 's-acc-instagram', service: 'Instagram', account: '@priya.••••', kind: 'social', status: 'ok', checkedAt: ago(1 * DAY), checkId: 'meta_sessions', sample: true },
    { id: 's-acc-icloud', service: 'Apple Account', account: 'p.s••••@example.com', kind: 'cloud', status: 'ok', checkedAt: ago(3 * DAY), checkId: 'apple_devices', sample: true },
  ];

  const sessions: (SampleSession & Sampled)[] = [
    { id: 's-ses-1', accountId: 's-acc-google', service: 'Google', device: 'Windows laptop · Chrome', place: 'Gurugram, Haryana', lastActive: ago(2 * HOUR + 14 * MIN), status: 'unfamiliar', kind: 'device', checkId: 'google_devices', sample: true },
    { id: 's-ses-2', accountId: 's-acc-google', service: 'Google', device: 'Redmi Note 12 · this phone', place: 'Noida, Uttar Pradesh', lastActive: ago(4 * MIN), status: 'current', kind: 'device', checkId: 'google_devices', sample: true },
    { id: 's-ses-3', accountId: 's-acc-whatsapp', service: 'WhatsApp', device: 'WhatsApp Web · Chrome on Windows', place: 'Linked 3 days ago', lastActive: ago(26 * HOUR), status: 'unfamiliar', kind: 'session', checkId: 'whatsapp_linked', sample: true },
    { id: 's-ses-4', accountId: 's-acc-instagram', service: 'Instagram', device: 'iPad (9th gen)', place: 'Lucknow, Uttar Pradesh', lastActive: ago(5 * DAY), status: 'recognised', kind: 'session', checkId: 'meta_sessions', sample: true },
    { id: 's-ses-5', accountId: 's-acc-icloud', service: 'Apple Account', device: 'MacBook Air', place: 'Noida, Uttar Pradesh', lastActive: ago(2 * DAY), status: 'recognised', kind: 'device', checkId: 'apple_devices', sample: true },
  ];

  const sharing: (SampleSharing & Sampled)[] = [
    { id: 's-sh-1', service: 'Google Maps', setting: 'location', value: '1 person', status: 'review', checkId: 'location_sharing', sample: true },
    { id: 's-sh-2', service: 'Google', setting: 'recovery', value: '+91 ••••• ••093', status: 'review', checkId: 'recovery_info', sample: true },
    { id: 's-sh-3', service: 'WhatsApp', setting: 'liveLocation', value: 'off', status: 'ok', checkId: 'whatsapp_live', sample: true },
    { id: 's-sh-4', service: 'Google · Apple', setting: 'family', value: 'none', status: 'ok', checkId: 'family_sharing', sample: true },
  ];

  const emailBaits: (EmailBait & Sampled)[] = [
    {
      id: 's-bait-1',
      name: 'Salary slip — March',
      template: 'email_verification' as TemplateId,
      recipient: 'my.private.inbox@example.com',
      createdAt: ago(5 * DAY),
      active: true,
      send: { status: 'sent', at: ago(5 * DAY - 2 * MIN) },
      sample: true,
    },
    {
      id: 's-bait-2',
      name: 'Bank statement copy',
      template: 'new_device' as TemplateId,
      recipient: 'my.private.inbox@example.com',
      createdAt: ago(12 * DAY),
      active: true,
      send: { status: 'sent', at: ago(12 * DAY - 1 * MIN) },
      sample: true,
    },
    {
      id: 's-bait-3',
      name: 'Passport scan',
      template: 'password_setup' as TemplateId,
      recipient: 'my.private.inbox@example.com',
      createdAt: ago(20 * DAY),
      active: false,
      send: { status: 'sent', at: ago(20 * DAY) },
      sample: true,
    },
  ];

  const linkEvents: (LinkEvent & Sampled)[] = [
    { id: 's-ev-1', baitId: 's-bait-1', at: ago(47 * MIN), detail: 'Chrome on Windows', sample: true },
    { id: 's-ev-2', baitId: 's-bait-2', at: ago(4 * DAY + 3 * HOUR), detail: 'Gmail app on Android', review: 'me' as EventReview, sample: true },
    { id: 's-ev-3', baitId: 's-bait-1', at: ago(2 * DAY + 5 * HOUR), detail: 'Chrome on Windows', review: 'notMe' as EventReview, sample: true },
  ];
  const baitEvents: (BaitEvent & Sampled)[] = [];

  const quietEntries: (QuietEntry & Sampled)[] = [
    { id: 's-q-1', area: 'mic', status: 'ok', at: ago(1 * DAY + 2 * HOUR), sample: true },
    { id: 's-q-2', area: 'location', status: 'review', note: 'Weather app set to “Allow all the time”', at: ago(2 * DAY), sample: true },
    { id: 's-q-3', area: 'camera', status: 'ok', at: ago(2 * DAY + 10 * MIN), sample: true },
  ];

  const trackerEntries: (TrackerEntry & Sampled)[] = [
    { id: 's-t-1', at: ago(3 * HOUR + 20 * MIN), result: 'none', sample: true },
    { id: 's-t-2', at: ago(5 * DAY), result: 'unknown', note: 'After the auto ride home', sample: true },
  ];

  const evidence: (Evidence & Sampled)[] = [
    { id: 's-v-1', kind: 'account', refId: 's-ses-1', checkId: 'google_devices', note: 'Windows laptop · Chrome, Gurugram', eventAt: ago(2 * HOUR + 14 * MIN), savedAt: ago(2 * HOUR), reviewNote: 'Not my laptop. Screenshot taken before signing it out.', sample: true },
    { id: 's-v-2', kind: 'link', refId: 's-ev-3', baitName: 'Salary slip — March', template: 'email_verification', detail: 'Chrome on Windows', eventAt: ago(2 * DAY + 5 * HOUR), savedAt: ago(2 * DAY), sample: true },
    { id: 's-v-3', kind: 'tracker', refId: 's-t-2', result: 'unknown', note: 'After the auto ride home', eventAt: ago(5 * DAY), savedAt: ago(5 * DAY - 10 * MIN), sample: true },
    { id: 's-v-4', kind: 'quiet', refId: 's-q-2', area: 'location', note: 'Weather app set to “Allow all the time”', eventAt: ago(2 * DAY), savedAt: ago(2 * DAY - 5 * MIN), sample: true },
  ];

  /** Items waiting for her review, shown in the Vault's "Pending review" filter. */
  const pending: (PendingSample & Sampled)[] = [
    { id: 's-p-1', kind: 'link', title: 'Salary slip — March', at: ago(47 * MIN), source: 'bait', ref: 's-bait-1', sample: true },
    { id: 's-p-2', kind: 'account', title: 'WhatsApp Web · Chrome on Windows', at: ago(26 * HOUR), source: 'account', ref: 's-ses-3', sample: true },
  ];

  const planDone: Record<string, boolean> = { '0-0': true, '0-1': true, '1-0': true };

  // Digital Footprint Audit sample: a part-done audit with a few exposures and remediation.
  const auditItems: Record<string, AuditItemState & Sampled> = {
    'social:profile_visibility': { status: 'reviewed_ok', at: ago(1 * DAY), sample: true },
    'social:contact_in_bio': { status: 'exposure', note: 'Phone number shown in Instagram bio', at: ago(1 * DAY), sample: true },
    'social:tags_links': { status: 'reviewed_ok', at: ago(1 * DAY), sample: true },
    'location:geotags': { status: 'exposure', note: 'Recent posts geotagged near home', at: ago(22 * HOUR), sample: true },
    'location:sharing_settings': { status: 'reviewed_ok', at: ago(22 * HOUR), sample: true },
    'contact:username_reuse': { status: 'exposure', note: 'Same handle on 5 services', at: ago(2 * DAY), sample: true },
    'photo:metadata': { status: 'exposure', note: '2 of 4 photos carried GPS coordinates', at: ago(3 * HOUR), sample: true },
    'photo:visual_id': { status: 'na', at: ago(3 * HOUR), sample: true },
  };
  const F = (module: AuditModuleId, itemId: string, title: string, source: AuditFinding['source'], ago2: number): AuditFinding & Sampled => ({
    id: `s-f-${itemId}`,
    module,
    itemId,
    title,
    source,
    at: ago(ago2),
    updatedAt: ago(ago2),
    sample: true,
  });
  const auditFindings: (AuditFinding & Sampled)[] = [
    F('social', 'contact_in_bio', 'Phone number visible in public Instagram bio', 'guided', 1 * DAY),
    F('location', 'geotags', 'Several recent posts geotagged within ~1 km of home', 'guided', 22 * HOUR),
    F('contact', 'username_reuse', 'The handle “priya.rao” is reused on 5 services', 'manual', 2 * DAY),
    { ...F('photo', 'metadata', '2 of 4 reviewed photos contained GPS coordinates', 'metadata', 3 * HOUR), detail: 'IMG_2043.jpg · 28.5679, 77.3261' },
  ];
  const R = (findingId: string | undefined, module: AuditModuleId, title: string, status: RemediationAction['status'], ago2: number): RemediationAction & Sampled => ({
    id: `s-r-${title.slice(0, 8)}`,
    findingId,
    module,
    title,
    status,
    createdAt: ago(ago2),
    updatedAt: ago(ago2),
    completedAt: status === 'completed' ? ago(ago2 - HOUR) : undefined,
    sample: true,
  });
  const remediation: (RemediationAction & Sampled)[] = [
    R('s-f-contact_in_bio', 'social', 'Remove phone number from Instagram bio', 'planned', 1 * DAY),
    R('s-f-geotags', 'location', 'Turn off location tags on new posts', 'planned', 22 * HOUR),
    R('s-f-metadata', 'photo', 'Strip location from photos before sharing', 'completed', 2 * HOUR),
    R(undefined, 'social', 'Set older posts to friends-only', 'completed', 2 * DAY),
  ];

  return { accounts, sessions, sharing, emailBaits, linkEvents, baitEvents, quietEntries, trackerEntries, evidence, pending, planDone, auditItems, auditFindings, remediation };
}

export type SampleData = ReturnType<typeof buildSample>;
