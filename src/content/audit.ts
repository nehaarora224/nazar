import { CameraIcon, Icon, MapPinIcon, UserCircleIcon, UsersThreeIcon } from 'phosphor-react-native';

import type { TKey } from '../i18n/en';
import type { AuditModuleId } from '../store';

/**
 * The Digital Footprint Audit's guided checks. Each module is a checklist; the Photo module
 * additionally runs real on-device EXIF extraction. Links point to official privacy pages so
 * the user acts on the real platform — Nazar never inspects a private account itself.
 */
export type AuditItem = {
  id: string;
  /** Marks the Photo module's metadata item, which opens the picker + EXIF reader. */
  interactive?: 'metadata';
};
export type AuditModule = {
  id: AuditModuleId;
  icon: Icon;
  items: AuditItem[];
  links?: { labelKey: TKey; url: string }[];
};

export const AUDIT_MODULES: AuditModule[] = [
  {
    id: 'social',
    icon: UserCircleIcon,
    items: [
      { id: 'profile_visibility' },
      { id: 'contact_in_bio' },
      { id: 'personal_details' },
      { id: 'routine_posts' },
      { id: 'tags_links' },
      { id: 'public_photos' },
    ],
    links: [
      { labelKey: 'af.link.instagram', url: 'https://accountscenter.instagram.com/' },
      { labelKey: 'af.link.facebook', url: 'https://www.facebook.com/privacy/checkup/' },
      { labelKey: 'af.link.google', url: 'https://myaccount.google.com/privacycheckup' },
    ],
  },
  {
    id: 'location',
    icon: MapPinIcon,
    items: [{ id: 'geotags' }, { id: 'realtime' }, { id: 'place_posts' }, { id: 'routines' }, { id: 'sharing_settings' }],
    links: [
      { labelKey: 'af.link.mapsSharing', url: 'https://www.google.com/maps/timeline' },
      { labelKey: 'af.link.instagram', url: 'https://accountscenter.instagram.com/' },
    ],
  },
  {
    id: 'contact',
    icon: UsersThreeIcon,
    items: [{ id: 'public_contact' }, { id: 'directories' }, { id: 'username_reuse' }, { id: 'extra_identifiers' }, { id: 'public_docs' }],
    links: [{ labelKey: 'af.link.googleYou', url: 'https://myactivity.google.com/results-about-you' }],
  },
  {
    id: 'photo',
    icon: CameraIcon,
    items: [
      { id: 'metadata', interactive: 'metadata' },
      { id: 'visual_address' },
      { id: 'visual_id' },
      { id: 'visual_screen' },
      { id: 'visual_background' },
    ],
  },
];

export const AUDIT_MODULE = (id: AuditModuleId) => AUDIT_MODULES.find((m) => m.id === id)!;
export const moduleKey = (m: AuditModuleId, part: 'title' | 'desc') => `af.${m}.${part}` as TKey;
export const itemKey = (m: AuditModuleId, item: string, part: 'title' | 'desc') => `af.item.${m}.${item}.${part}` as TKey;
/** Suggested remediation action title for a module, offered when an exposure is found. */
export const remediationKey = (m: AuditModuleId) => `af.remedy.${m}` as TKey;

export const ALL_AUDIT_ITEMS = AUDIT_MODULES.flatMap((m) => m.items.map((i) => ({ module: m.id, item: i.id })));
