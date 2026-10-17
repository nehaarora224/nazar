import { useEffect, useState } from 'react';
import { Lock, Smartphone, CloudOff, Fish, Bluetooth, KeyRound, ImageIcon, BadgeCheck, FileDown, Send, ChevronRight, Camera } from 'lucide-react';
import { useI18n } from '../i18n';
import { fill } from '../strings';
import { Shell } from '../components/Shell';
import type { ScreenProps } from '../types';

type Kind = 'bait' | 'tracker' | 'signin' | 'screenshot';
type Filter = 'all' | Kind;

type Item = {
  id: string;
  kind: Kind;
  day: 'today' | 'yesterday';
  title: keyof ReturnType<typeof useI18n>['t']['vault']['items'];
  time: keyof ReturnType<typeof useI18n>['t']['vault']['times'];
  photo?: boolean;
};

// Oldest last. The hash chain runs oldest → newest.
const ITEMS: Item[] = [
  { id: 'e6', kind: 'bait', day: 'today', title: 'bait', time: 't1', photo: true },
  { id: 'e5', kind: 'tracker', day: 'today', title: 'trackerReport', time: 't2' },
  { id: 'e4', kind: 'signin', day: 'today', title: 'signin', time: 't3' },
  { id: 'e3', kind: 'screenshot', day: 'yesterday', title: 'screenshot', time: 't4' },
  { id: 'e2', kind: 'tracker', day: 'yesterday', title: 'trackerSeen', time: 't5' },
  { id: 'e1', kind: 'signin', day: 'yesterday', title: 'account', time: 't6' },
];

const ICONS: Record<Kind, typeof Fish> = { bait: Fish, tracker: Bluetooth, signin: KeyRound, screenshot: ImageIcon };

/** SHA-256 hash chain: each item's fingerprint covers its content and the previous fingerprint. */
async function hashChain(items: Item[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!globalThis.crypto?.subtle) return out;
  let prev = '0'.repeat(64);
  for (const it of [...items].reverse()) {
    const data = new TextEncoder().encode(JSON.stringify({ ...it, prev }));
    const buf = await crypto.subtle.digest('SHA-256', data);
    const hex = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
    out[it.id] = hex;
    prev = hex;
  }
  return out;
}

export function Vault(props: ScreenProps) {
  const { t } = useI18n();
  const v = t.vault;
  const [filter, setFilter] = useState<Filter>('all');
  const [hashes, setHashes] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    hashChain(ITEMS).then((h) => alive && setHashes(h)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const filters: Filter[] = ['all', 'bait', 'tracker', 'signin', 'screenshot'];
  const visible = ITEMS.filter((i) => filter === 'all' || i.kind === filter);
  const groups = (['today', 'yesterday'] as const)
    .map((day) => ({ day, items: visible.filter((i) => i.day === day) }))
    .filter((g) => g.items.length);

  return (
    <Shell {...props} tab="vault" header={{ kind: 'brand' }}>
      <p className="lock-chip">
        <Lock size={14} aria-hidden="true" />
        {v.chip}
      </p>
      <h1 className="h1" tabIndex={-1}>
        {v.heading}
      </h1>
      <p className="lede">{v.sub}</p>

      <div className="card card--lav summary">
        <p className="summary__count">{v.summary}</p>
        <ul className="summary__facts" role="list">
          <li>
            <Smartphone size={15} aria-hidden="true" />
            {v.onPhone}
          </li>
          <li>
            <CloudOff size={15} aria-hidden="true" />
            {v.backup}
          </li>
        </ul>
      </div>

      <div className="filters" role="group" aria-label={v.filtersLabel}>
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            className={`filter${filter === f ? ' is-active' : ''}`}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {v.filters[f]}
          </button>
        ))}
      </div>

      <p className="note" aria-live="polite">
        {fill(v.showing, { n: visible.length })}
      </p>

      {groups.length === 0 && <p className="lede">{v.empty}</p>}
      {groups.map((g) => (
        <section key={g.day} aria-labelledby={`vault-${g.day}`}>
          <h2 className="group-label" id={`vault-${g.day}`}>
            {v[g.day]}
          </h2>
          <ul className="timeline" role="list">
            {g.items.map((it) => {
              const Icon = ICONS[it.kind];
              const h = hashes[it.id];
              const content = (
                <>
                  <span className={`row__icon row__icon--${it.kind === 'bait' ? 'act' : 'lav'}`} aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="row__text">
                    <span className="row__title">{v.items[it.title]}</span>
                    <span className="row__desc">
                      {v.times[it.time]}
                      {it.photo && (
                        <>
                          {' · '}
                          <Camera size={13} aria-hidden="true" className="inline-icon" /> {v.photoAttached}
                        </>
                      )}
                    </span>
                    <span className="verify">
                      <span className="verified">
                        <BadgeCheck size={14} aria-hidden="true" />
                        {v.verified}
                      </span>
                      {h && (
                        <span className="hash" title={h}>
                          <span className="sr-only">{v.fingerprint}: </span>
                          {h.slice(0, 6)}…{h.slice(-4)}
                        </span>
                      )}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={it.id}>
                  {it.kind === 'bait' ? (
                    <button type="button" className="tl-item tl-item--btn" onClick={() => props.nav('bait')}>
                      {content}
                      <ChevronRight size={20} aria-hidden="true" className="row__end" />
                    </button>
                  ) : (
                    <div className="tl-item">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="note">{v.verifiedHint}</p>

      <button type="button" className="btn btn--primary btn--block btn--tall" onClick={() => props.toast(v.exportToast)}>
        <FileDown size={18} aria-hidden="true" />
        <span className="btn__stack">
          <span>{v.export}</span>
          <span className="btn__sub">{v.exportSub}</span>
        </span>
      </button>
      <button type="button" className="link-btn" onClick={() => props.toast(v.sendToast)}>
        <Send size={16} aria-hidden="true" />
        {v.send}
      </button>
    </Shell>
  );
}
