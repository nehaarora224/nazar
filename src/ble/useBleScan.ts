import { useCallback, useEffect, useState } from 'react';

import { bleAdapter } from './bleAdapter';
import { ScanController, sortedDevices, type ScanError, type ScanPhase } from './scan';
import type { BleDevice } from './types';

type Snapshot = { phase: ScanPhase; error?: ScanError; devices: BleDevice[] };

/** React wrapper around ScanController. Results live only in memory for the life of the screen. */
export function useBleScan(durationMs = 15000) {
  const [snap, setSnap] = useState<Snapshot>({ phase: 'idle', devices: [] });
  // Lazy state init creates the controller once; it is stable, so reading it in render is fine.
  const [ctrl] = useState(() => {
    const c = new ScanController(bleAdapter, {
      durationMs,
      onChange: () => setSnap({ phase: c.phase, error: c.error, devices: sortedDevices(c.devices) }),
    });
    return c;
  });

  useEffect(() => () => ctrl.dispose(), [ctrl]);

  const start = useCallback(() => ctrl.start(), [ctrl]);
  const stop = useCallback(() => ctrl.stop(), [ctrl]);

  return { supported: bleAdapter.supported, phase: snap.phase, error: snap.error, devices: snap.devices, start, stop };
}
