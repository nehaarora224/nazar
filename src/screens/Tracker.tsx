import { useEffect, useRef, useState } from 'react';
import { Bluetooth, Footprints, LocateFixed, Volume2, FileDown, Square } from 'lucide-react';
import { useI18n } from '../i18n';
import { fill } from '../strings';
import { Shell } from '../components/Shell';
import { RiskPill } from '../components/Pill';
import type { ScreenProps } from '../types';

const STOPS = [
  { n: 1, t: '8:10', x: 52, y: 40 },
  { n: 2, t: '10:30', x: 108, y: 112 },
  { n: 3, t: '1:15', x: 196, y: 80 },
  { n: 4, t: '6:05', x: 244, y: 140 },
];

export function Tracker(props: ScreenProps) {
  const { t } = useI18n();
  const tr = t.tracker;
  const [finding, setFinding] = useState(false);
  const [level, setLevel] = useState(1); // 1 far … 4 very close
  const [saved, setSaved] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    if (!finding) return;
    timer.current = window.setInterval(() => setLevel((l) => (l < 4 ? l + 1 : l)), 1400);
    return () => window.clearInterval(timer.current);
  }, [finding]);

  const toggleFind = () => {
    if (finding) {
      setFinding(false);
      setLevel(1);
    } else setFinding(true);
  };

  const signalText = level >= 4 ? tr.close : level >= 2 ? tr.near : tr.far;
  const path = STOPS.map((s, i) => `${i ? 'L' : 'M'}${s.x} ${s.y}`).join(' ');

  return (
    <Shell
      {...props}
      header={{
        kind: 'back',
        backTo: 'dashboard',
        label: t.dash.cards.trackers.title,
      }}
    >
      <span className="pill pill--alert tracker-pill">
        <Bluetooth size={14} aria-hidden="true" />
        {tr.label}
      </span>
      <figure className="map" role="img" aria-label={tr.mapLabel}>
        <svg viewBox="0 0 300 180" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
          <rect width="300" height="180" className="map__bg" />
          <ellipse cx="40" cy="140" rx="46" ry="28" className="map__park" />
          <ellipse cx="250" cy="34" rx="40" ry="22" className="map__park" />
          <path d="M0 150 C80 120 200 170 300 120 L300 180 L0 180Z" className="map__water" />
          <g className="map__roads">
            <path d="M20 0 L80 180" />
            <path d="M0 70 L300 50" />
            <path d="M150 0 L170 180" />
            <path d="M0 120 L300 104" />
            <path d="M232 0 L262 180" />
          </g>
          <path d={path} className="map__path" />
          {STOPS.map((s) => (
            <g key={s.n} transform={`translate(${s.x} ${s.y})`}>
              {s.n === 4 && <circle r="17" className="map__halo" />}
              <circle r="11" className={s.n === 4 ? 'map__stop map__stop--now' : 'map__stop'} />
              <text textAnchor="middle" dy="4" className={s.n === 4 ? 'map__num map__num--now' : 'map__num'}>
                {s.n}
              </text>
            </g>
          ))}
        </svg>
      </figure>
      <ul className="stop-list" role="list">
        {STOPS.map((s) => (
          <li key={s.n} className={s.n === 4 ? 'is-now' : ''}>
            {fill(tr.stop, { n: s.n, t: s.t })}
          </li>
        ))}
      </ul>

      <section className="card card--story" aria-labelledby="tracker-h">
        <span className="row__icon row__icon--act" aria-hidden="true">
          <Footprints size={20} />
        </span>
        <div>
          <h1 className="h2" id="tracker-h" tabIndex={-1}>
            {tr.heading}
          </h1>
          <p className="card__sub">{tr.sub}</p>
        </div>
      </section>

      <section className="signal card card--lav">
        <div>
          <p className="eyebrow">{tr.signal}</p>
          <p className="signal__text" aria-live="polite">
            {signalText}
          </p>
        </div>
        <span className="bars" aria-hidden="true">
          {[1, 2, 3, 4].map((b) => (
            <span key={b} className={b <= level ? 'is-on' : ''} style={{ height: `${10 + b * 7}px` }} />
          ))}
        </span>
      </section>

      <div className="action-grid">
        <div className="action">
          <button type="button" className="btn btn--primary" onClick={toggleFind} aria-pressed={finding}>
            {finding ? <Square size={16} aria-hidden="true" /> : <LocateFixed size={18} aria-hidden="true" />}
            <span>{finding ? tr.stopFinding : tr.findIt}</span>
          </button>
          <RiskPill risk="safe" />
        </div>
        <div className="action">
          <button type="button" className="btn btn--outline" onClick={() => props.toast(tr.soundPlayed)}>
            <Volume2 size={18} aria-hidden="true" />
            <span>{tr.playSound}</span>
          </button>
          <RiskPill risk="notice" />
        </div>
      </div>
      <p className="note">{tr.soundNote}</p>

      <button
        type="button"
        className="btn btn--ghost btn--block"
        onClick={() => {
          setSaved(true);
          props.toast(tr.saved);
        }}
        disabled={saved}
      >
        <FileDown size={18} aria-hidden="true" />
        <span>{saved ? tr.saved : tr.saveReport}</span>
      </button>
    </Shell>
  );
}
