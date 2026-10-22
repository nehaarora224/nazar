/**
 * User-added "accounts to review" — pure data model and list operations, with no React, storage or
 * crypto imports, so it is unit-testable and shared by the store and screens. These records hold
 * ONLY what the person types: which service, an optional label to recognise it, a status, and their
 * own notes. Nazar never signs in, reads sessions, or stores passwords/codes/recovery keys — a
 * status such as "unfamiliar session" is what the USER reported, never something Nazar detected.
 */

export type ReviewServiceId = 'google' | 'instagram' | 'whatsapp' | 'email' | 'custom';

/** The four states a review account moves through. "unfamiliar" is a user-reported finding. */
export type ReviewAccountStatus = 'not_checked' | 'in_progress' | 'unfamiliar' | 'reviewed';
export const REVIEW_STATUSES: ReviewAccountStatus[] = ['not_checked', 'in_progress', 'unfamiliar', 'reviewed'];

export type ReviewAccount = {
  id: string;
  service: ReviewServiceId;
  /** Display name: the brand for a known service, or the user's text for a custom one. */
  serviceName: string;
  /** Optional user-entered identifier (a handle or email) to recognise the account — never a password. */
  label?: string;
  status: ReviewAccountStatus;
  /** The person's own recorded findings. Stored inside the encrypted vault like all other data. */
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type NewReviewAccount = { service: ReviewServiceId; serviceName: string; label?: string };
export type ReviewAccountPatch = Partial<Pick<ReviewAccount, 'status' | 'note' | 'label' | 'serviceName'>>;

const clean = (s: string | undefined) => {
  const t = s?.trim();
  return t ? t : undefined;
};

export function createReviewAccount(input: NewReviewAccount, id: string, now: number): ReviewAccount {
  return {
    id,
    service: input.service,
    serviceName: input.serviceName.trim(),
    label: clean(input.label),
    status: 'not_checked',
    createdAt: now,
    updatedAt: now,
  };
}

/** Apply a partial edit to one account, bumping updatedAt. Empty note/label clears it; blank name is ignored. */
export function patchReviewAccounts(list: ReviewAccount[], id: string, patch: ReviewAccountPatch, now: number): ReviewAccount[] {
  return list.map((a) => {
    if (a.id !== id) return a;
    const next: ReviewAccount = { ...a, updatedAt: now };
    if ('status' in patch && patch.status) next.status = patch.status;
    if ('serviceName' in patch) next.serviceName = clean(patch.serviceName) ?? a.serviceName;
    if ('label' in patch) next.label = clean(patch.label);
    if ('note' in patch) next.note = clean(patch.note);
    return next;
  });
}

export function dropReviewAccount(list: ReviewAccount[], id: string): ReviewAccount[] {
  return list.filter((a) => a.id !== id);
}

export function reviewAccountSummary(list: ReviewAccount[]) {
  const by = (s: ReviewAccountStatus) => list.filter((a) => a.status === s).length;
  return {
    total: list.length,
    notChecked: by('not_checked'),
    inProgress: by('in_progress'),
    attention: by('unfamiliar'),
    reviewed: by('reviewed'),
  };
}
