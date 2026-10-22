import { EnvelopeSimpleIcon, GoogleLogoIcon, Icon, InstagramLogoIcon, PlusCircleIcon, WhatsappLogoIcon } from 'phosphor-react-native';

import type { TKey } from '../i18n';
import type { ReviewAccountStatus, ReviewServiceId } from '../reviewAccounts';
import type { Tone } from '../theme';

/**
 * Known services the person can add to review. `url`, where set, is the service's OWN official
 * page for seeing signed-in devices/sessions — Nazar only opens it; it never signs in. Services
 * whose device list lives in-app (no stable public URL) have no `url`, and the screen says so.
 */
export type ReviewService = {
  id: ReviewServiceId;
  /** Brand name (not translated) for known services; email/custom use a translated label in the UI. */
  brand?: string;
  icon: Icon;
  url?: string;
};

export const REVIEW_SERVICES: ReviewService[] = [
  { id: 'google', brand: 'Google', icon: GoogleLogoIcon, url: 'https://myaccount.google.com/device-activity' },
  { id: 'instagram', brand: 'Instagram', icon: InstagramLogoIcon, url: 'https://www.instagram.com/session/login_activity/' },
  // WhatsApp's linked devices live in the app (Settings → Linked devices); there is no stable web URL.
  { id: 'whatsapp', brand: 'WhatsApp', icon: WhatsappLogoIcon },
  // Email providers differ; the screen guides the person to their provider's security page.
  { id: 'email', icon: EnvelopeSimpleIcon },
  { id: 'custom', icon: PlusCircleIcon },
];

export const REVIEW_SERVICE_BY_ID = Object.fromEntries(REVIEW_SERVICES.map((s) => [s.id, s])) as Record<ReviewServiceId, ReviewService>;

/** i18n key for a service's display name (brand services resolve to the brand; email/custom to a word). */
export const serviceNameKey = (id: ReviewServiceId): TKey => `racc.svcName.${id}` as TKey;
/** i18n key for a service's "how to review" steps. */
export const serviceStepsKey = (id: ReviewServiceId): TKey => `racc.svcSteps.${id}` as TKey;

/** Tone + label for each status. "unfamiliar" is user-reported, so it reads as "look", not "act". */
export const REVIEW_STATUS_META: Record<ReviewAccountStatus, { tone: Tone; key: TKey }> = {
  not_checked: { tone: 'off', key: 'racc.status.not_checked' },
  in_progress: { tone: 'off', key: 'racc.status.in_progress' },
  unfamiliar: { tone: 'look', key: 'racc.status.unfamiliar' },
  reviewed: { tone: 'safe', key: 'racc.status.reviewed' },
};
