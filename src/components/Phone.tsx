import type { ReactNode } from 'react';
import { Signal, Wifi, BatteryFull } from 'lucide-react';

type Props = { children: ReactNode; tone?: 'nazar' | 'calc'; label?: string };

/** A phone frame with a decorative status bar and home indicator. */
export function Phone({ children, tone = 'nazar', label }: Props) {
  return (
    <div className={`phone phone--${tone}`} role="group" aria-label={label}>
      <div className="phone__screen">
        <div className="statusbar" aria-hidden="true">
          <span className="statusbar__time">9:41</span>
          <span className="statusbar__camera" />
          <span className="statusbar__icons">
            <Signal size={14} strokeWidth={2.5} />
            <Wifi size={14} strokeWidth={2.5} />
            <BatteryFull size={16} strokeWidth={2} />
          </span>
        </div>
        <div className="phone__body">{children}</div>
        <div className="phone__home" aria-hidden="true" />
      </div>
    </div>
  );
}
