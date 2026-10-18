import type { TKey } from '../i18n/en';
import type { TemplateId } from '../store';

/**
 * Bait email templates. They are deliberately generic: no company names, logos or sender
 * spoofing, and the link never asks for a password. They are only ever sent to her own inbox.
 */
export const TEMPLATES: { id: TemplateId; icon: 'key' | 'shield' | 'envelope' | 'device' }[] = [
  { id: 'password_setup', icon: 'key' },
  { id: 'security_review', icon: 'shield' },
  { id: 'email_verification', icon: 'envelope' },
  { id: 'new_device', icon: 'device' },
];

export const tplKey = (id: TemplateId, part: 'name' | 'desc' | 'subject' | 'body' | 'cta') => `tpl.${id}.${part}` as TKey;
