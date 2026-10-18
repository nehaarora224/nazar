// Shared types for the Bait Test backend.

/** Approved templates. Mirrors the client allowlist; the server never sends an unknown template. */
export const TEMPLATE_IDS = ['password_setup', 'security_review', 'email_verification', 'new_device'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

/**
 * The full event taxonomy. These are distinct and never conflated:
 *  - accepted:       the provider accepted the send request (NOT proof of delivery)
 *  - delivered:      the provider confirmed delivery to the recipient's mail server (webhook)
 *  - bounced:        hard bounce / undeliverable (webhook)
 *  - rejected:       complaint / blocked / dropped (webhook)
 *  - link_access:    the recipient opened the authorized awareness link ("Recorded link access")
 *  - interpretation: the recipient told us how they read the message, from the landing page
 */
export type EventType = 'accepted' | 'delivered' | 'bounced' | 'rejected' | 'link_access' | 'interpretation';

export type BaitRecord = {
  id: string;
  /** SHA-256 of the owner's device secret. The owner id is NEVER taken from the client. */
  ownerHash: string;
  recipient: string;
  template: TemplateId;
  name: string;
  /** SHA-256 of the raw link token. The raw token is only ever in the recipient's email. */
  tokenHash: string;
  createdAt: number;
  expiresAt: number;
  revoked: boolean;
  /** The provider's message id, if a send was accepted. Links webhooks back to this bait. */
  providerId?: string;
};

export type EventRecord = {
  id: string;
  baitId: string;
  type: EventType;
  at: number;
  detail?: string;
};

/** What the mobile app receives for the timeline. Delivery/bounce stay in `status`. */
export type PublicEvent = { id: string; at: number; type: EventType; detail?: string };
