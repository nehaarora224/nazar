import { TEMPLATE_IDS, type TemplateId } from './model.ts';

// Deliberately strict-but-simple. One recipient, sane lengths, template from the allowlist.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type CreateInput = { recipient: string; template: TemplateId; name: string; subject?: string; body?: string };

export function validateCreate(raw: unknown): { ok: true; value: CreateInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Body must be a JSON object' };
  const b = raw as Record<string, unknown>;

  const recipient = typeof b.recipient === 'string' ? b.recipient.trim() : '';
  if (!EMAIL_RE.test(recipient) || recipient.length > 254) return { ok: false, error: 'A valid single recipient email is required' };

  const template = b.template as TemplateId;
  if (!TEMPLATE_IDS.includes(template)) return { ok: false, error: 'Unknown template' };

  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name || name.length > 80) return { ok: false, error: 'A test name of 1–80 characters is required' };

  const subject = typeof b.subject === 'string' ? b.subject.slice(0, 200) : undefined;
  const body = typeof b.body === 'string' ? b.body.slice(0, 5000) : undefined;

  return { ok: true, value: { recipient, template, name, subject, body } };
}

export const isEmail = (s: string) => EMAIL_RE.test(s);
