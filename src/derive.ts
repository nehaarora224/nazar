import { ACCOUNT_CHECKS } from './content/accountChecks';
import { latestQuiet, latestTracker, QuietArea, Store, TrackerResult } from './store';
import type { Tone } from './theme';

type Data = Store['data'];

export function accountSummary(data: Data) {
  const answers = ACCOUNT_CHECKS.map((c) => data.accountAnswers[c.id]);
  const done = answers.filter((a) => a && a.status !== 'skipped').length;
  const review = answers.filter((a) => a?.status === 'review').length;
  return { total: ACCOUNT_CHECKS.length, done, review, todo: ACCOUNT_CHECKS.length - done, started: answers.some(Boolean) };
}

export const QUIET_AREAS: QuietArea[] = ['mic', 'camera', 'location'];

export function quietSummary(data: Data) {
  const latest = QUIET_AREAS.map((a) => latestQuiet(data.quietEntries, a));
  const done = latest.filter(Boolean).length;
  const review = latest.filter((e) => e?.status === 'review').length;
  const lastAt = latest.reduce((m, e) => Math.max(m, e?.at ?? 0), 0);
  return { done, review, lastAt };
}

export const TRACKER_TONE: Record<TrackerResult, Tone> = { tracker: 'act', unknown: 'look', incomplete: 'look', none: 'safe' };

export type ExposureKey = 'movement' | 'location' | 'messages' | 'photos';

/** What someone else might see, derived only from checks she has actually done. */
export function exposure(data: Data): { key: ExposureKey; t: Tone; state: 'none' | 'review' | 'clear' | TrackerResult }[] {
  const trk = latestTracker(data.trackerEntries);
  const movement = trk
    ? { key: 'movement' as const, t: TRACKER_TONE[trk.result], state: trk.result === 'none' ? ('clear' as const) : trk.result }
    : { key: 'movement' as const, t: 'off' as Tone, state: 'none' as const };

  const fromAccounts = (key: 'messages' | 'photos' | 'location', extra?: 'review' | 'ok' | undefined) => {
    const answers = ACCOUNT_CHECKS.filter((c) => c.exposes.includes(key)).map((c) => data.accountAnswers[c.id]);
    const review = answers.some((a) => a?.status === 'review') || extra === 'review';
    const checked = answers.some((a) => a?.status === 'ok') || extra === 'ok';
    return review
      ? { key, t: 'look' as Tone, state: 'review' as const }
      : checked
        ? { key, t: 'safe' as Tone, state: 'clear' as const }
        : { key, t: 'off' as Tone, state: 'none' as const };
  };

  const loc = latestQuiet(data.quietEntries, 'location')?.status;
  const items = [movement, fromAccounts('location', loc), fromAccounts('messages'), fromAccounts('photos')];
  const rank: Record<Tone, number> = { act: 0, look: 1, off: 2, safe: 3 };
  return items.sort((a, b) => rank[a.t] - rank[b.t]);
}
