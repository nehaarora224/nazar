import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, CircleUserRound, Bluetooth, Radar, Search, Eye, Check } from 'lucide-react';
import { useI18n } from '../i18n';
import { fill } from '../strings';
import { Shell } from '../components/Shell';
import { StatusDot } from '../components/Pill';
import type { ScreenId, ScreenProps, Status } from '../types';

function greeting(t: ReturnType<typeof useI18n>['t'], mode: ScreenProps['mode']) {
  if (mode === 'pitch') return t.dash.greetEvening; // matches the designed frame
  const h = new Date().getHours();
  return h < 12 ? t.dash.greetMorning : h < 17 ? t.dash.greetAfternoon : t.dash.greetEvening;
}

export function Dashboard(props: ScreenProps) {
  const { t } = useI18n();
  const { nav, mode } = props;
  const [progress, setProgress] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const timer = useRef<number>();

  useEffect(() => () => window.clearInterval(timer.current), []);

  const runCheck = () => {
    if (progress !== null) return;
    setChecked(false);
    setProgress(0);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    timer.current = window.setInterval(
      () => {
        setProgress((p) => {
          const next = (p ?? 0) + (reduce ? 50 : 10);
          if (next >= 100) {
            window.clearInterval(timer.current);
            setChecked(true);
            return null;
          }
          return next;
        });
      },
      reduce ? 300 : 180,
    );
  };

  const cards: { id: string; title: string; status: string; dot: Status; Icon: typeof Eye; to: ScreenId }[] = [
    { id: 'apps', ...t.dash.cards.apps, dot: 'safe', Icon: LayoutGrid, to: 'exposure' },
    { id: 'accounts', ...t.dash.cards.accounts, dot: 'look', Icon: CircleUserRound, to: 'exposure' },
    { id: 'trackers', ...t.dash.cards.trackers, dot: 'look', Icon: Bluetooth, to: 'tracker' },
    { id: 'background', ...t.dash.cards.background, dot: 'safe', Icon: Radar, to: 'bait' },
  ];

  const ringR = 66;
  const circ = 2 * Math.PI * ringR;

  return (
    <Shell {...props} tab="dashboard" header={{ kind: 'brand' }}>
      <p className="eyebrow">{greeting(t, mode)}</p>
      <h1 className="h1" tabIndex={-1}>
        {t.dash.heading}
      </h1>

      <div className="ring" role="img" aria-label={fill(t.dash.ringLabel, { n: 2 })}>
        <svg viewBox="0 0 160 160" aria-hidden="true">
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6B7FC4" />
              <stop offset="100%" stopColor="#4F9A94" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r={ringR} className="ring__track" />
          <circle
            cx="80"
            cy="80"
            r={ringR}
            className="ring__value"
            stroke="url(#ringGrad)"
            strokeDasharray={circ}
            strokeDashoffset={circ * 0.18}
            transform="rotate(-90 80 80)"
          />
        </svg>
        <div className="ring__center" aria-hidden="true">
          <Eye size={18} className="ring__eye" />
          <span className="ring__title">{t.dash.ringMostly}</span>
          <span className="ring__sub">
            <span className="dot dot--look" />
            {fill(t.dash.ringThings, { n: 2 })}
          </span>
        </div>
      </div>

      <ul className="cards" role="list">
        {cards.map(({ id, title, status, dot, Icon, to }) => (
          <li key={id}>
            <button type="button" className="card card--tile" onClick={() => nav(to)}>
              <span className="card__top">
                <span className="icon-chip" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <StatusDot status={dot} />
              </span>
              <span className="card__title">{title}</span>
              <span className="card__sub">{status}</span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="btn btn--primary btn--block"
        onClick={runCheck}
        aria-busy={progress !== null}
      >
        {progress !== null ? (
          <span>{fill(t.dash.checking, { p: progress })}</span>
        ) : (
          <>
            <Search size={18} aria-hidden="true" />
            <span>{t.dash.check}</span>
          </>
        )}
      </button>
      {progress !== null && (
        <div
          className="progress"
          role="progressbar"
          aria-label={t.dash.progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className="check-status" role="status">
        {checked && (
          <>
            <Check size={16} aria-hidden="true" /> {t.dash.checkedNow}
          </>
        )}
      </p>
    </Shell>
  );
}
