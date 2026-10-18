import { config, providerConfigured } from './config.ts';

export type SendOutcome =
  | { ok: true; providerId: string }
  | { ok: false; reason: 'unconfigured' | 'failed'; error?: string };

export interface EmailProvider {
  readonly name: string;
  send(msg: { to: string; subject: string; html: string; text: string }): Promise<SendOutcome>;
}

/** Resend adapter. Calls the HTTP API with the key from a server env var only. */
class ResendProvider implements EmailProvider {
  name = 'resend';
  async send(msg: { to: string; subject: string; html: string; text: string }): Promise<SendOutcome> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: config.mailFrom, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      });
      if (!res.ok) {
        // Do not log the recipient or body; just the status.
        return { ok: false, reason: 'failed', error: `provider HTTP ${res.status}` };
      }
      const json = (await res.json()) as { id?: string };
      if (!json.id) return { ok: false, reason: 'failed', error: 'provider returned no id' };
      return { ok: true, providerId: json.id };
    } catch (e) {
      return { ok: false, reason: 'failed', error: e instanceof Error ? e.message : 'send error' };
    }
  }
}

/** Used when no provider is configured: it never pretends to have sent anything. */
class UnconfiguredProvider implements EmailProvider {
  name = 'unconfigured';
  async send(): Promise<SendOutcome> {
    return { ok: false, reason: 'unconfigured' };
  }
}

export function getProvider(): EmailProvider {
  return providerConfigured() ? new ResendProvider() : new UnconfiguredProvider();
}
