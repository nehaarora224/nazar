import type { TKey } from '../i18n';

export type AccountSection = 'linked' | 'sessions' | 'sharing';

/**
 * Guided account checks. Nazar has no account integrations: each check sends her to the
 * service's own settings (an official page where one exists) and she records what she saw.
 */
export type AccountCheck = {
  id: string;
  section: AccountSection;
  /** Brand name, never translated. */
  service: string;
  url?: string;
  /** Feeds the Exposure screen. */
  exposes: ('messages' | 'photos' | 'location')[];
};

export const ACCOUNT_CHECKS: AccountCheck[] = [
  { id: 'google_devices', section: 'linked', service: 'Google', url: 'https://myaccount.google.com/device-activity', exposes: ['photos', 'messages'] },
  { id: 'whatsapp_linked', section: 'linked', service: 'WhatsApp', exposes: ['messages'] },
  { id: 'apple_devices', section: 'linked', service: 'Apple', url: 'https://account.apple.com', exposes: ['photos', 'messages', 'location'] },
  { id: 'google_activity', section: 'sessions', service: 'Google', url: 'https://myaccount.google.com/notifications', exposes: ['messages', 'photos'] },
  { id: 'meta_sessions', section: 'sessions', service: 'Instagram · Facebook', exposes: ['messages'] },
  { id: 'telegram_devices', section: 'sessions', service: 'Telegram', exposes: ['messages'] },
  { id: 'location_sharing', section: 'sharing', service: 'Google Maps', exposes: ['location'] },
  { id: 'whatsapp_live', section: 'sharing', service: 'WhatsApp', exposes: ['location'] },
  { id: 'recovery_info', section: 'sharing', service: 'Google', url: 'https://myaccount.google.com/security', exposes: ['messages', 'photos'] },
  { id: 'family_sharing', section: 'sharing', service: 'Google · Apple', exposes: ['location', 'photos'] },
];

export const SECTIONS: { id: AccountSection; title: TKey }[] = [
  { id: 'linked', title: 'acct.section.linked' },
  { id: 'sessions', title: 'acct.section.sessions' },
  { id: 'sharing', title: 'acct.section.sharing' },
];

export const checkKey = (id: string, part: 'title' | 'steps' | 'why' | 'next') => `ac.${id}.${part}` as TKey;
