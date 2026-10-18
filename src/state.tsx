import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { Tone } from './theme';

export type DashboardState = 'safe' | 'review' | 'alert';

export type Tile = { key: 'apps' | 'accounts' | 'trackers' | 'background'; name: string; status: string; t: Tone };

export const RING: Record<DashboardState, { pct: number; label: string; sub: string; t: Tone }> = {
  safe: { pct: 1, label: "You're safe", sub: 'Everything is calm', t: 'safe' },
  review: { pct: 0.75, label: 'Mostly safe', sub: '2 things to look at', t: 'look' },
  alert: { pct: 0.45, label: 'Needs care', sub: 'A tracker is nearby', t: 'act' },
};

export const TILES: Record<DashboardState, Tile[]> = {
  safe: [
    { key: 'apps', name: 'Apps', status: 'No hidden apps', t: 'safe' },
    { key: 'accounts', name: 'Accounts', status: 'Only your devices', t: 'safe' },
    { key: 'trackers', name: 'Trackers', status: 'None nearby', t: 'safe' },
    { key: 'background', name: 'Background check', status: 'On · watching quietly', t: 'safe' },
  ],
  review: [
    { key: 'apps', name: 'Apps', status: 'No hidden apps', t: 'safe' },
    { key: 'accounts', name: 'Accounts', status: '1 new sign-in', t: 'look' },
    { key: 'trackers', name: 'Trackers', status: '1 to review', t: 'look' },
    { key: 'background', name: 'Background check', status: 'On · watching quietly', t: 'safe' },
  ],
  alert: [
    { key: 'apps', name: 'Apps', status: 'No hidden apps', t: 'safe' },
    { key: 'accounts', name: 'Accounts', status: '1 new sign-in', t: 'look' },
    { key: 'trackers', name: 'Trackers', status: 'Following you', t: 'act' },
    { key: 'background', name: 'Background check', status: 'On · watching quietly', t: 'safe' },
  ],
};

type NazarState = {
  dashboard: DashboardState;
  cycleDashboard: () => void;
  /** Plan steps ticked off, keyed "stage-action". */
  planDone: Record<string, boolean>;
  togglePlanStep: (key: string) => void;
};

const Ctx = createContext<NazarState | null>(null);

export function NazarProvider({ children }: { children: ReactNode }) {
  const [dashboard, setDashboard] = useState<DashboardState>('review');
  const [planDone, setPlanDone] = useState<Record<string, boolean>>({ '0-0': true, '0-1': true });

  const value = useMemo<NazarState>(
    () => ({
      dashboard,
      cycleDashboard: () => setDashboard((d) => (d === 'review' ? 'alert' : d === 'alert' ? 'safe' : 'review')),
      planDone,
      togglePlanStep: (key) => setPlanDone((p) => ({ ...p, [key]: !p[key] })),
    }),
    [dashboard, planDone],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNazar() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNazar must be used inside NazarProvider');
  return v;
}
