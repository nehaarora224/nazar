import { useState } from 'react';
import { Camera, KeyRound, Timer, ShieldCheck, StickyNote, Images, MessagesSquare, Landmark, Contact, Plus, Fish } from 'lucide-react';
import { useI18n } from '../i18n';
import { fill } from '../strings';
import { Shell } from '../components/Shell';
import { RiskPill } from '../components/Pill';
import type { ScreenProps } from '../types';

type BaitId = 'passwords' | 'album' | 'chat' | 'bank' | 'contact';

const BAITS: { id: BaitId; Icon: typeof StickyNote; risk: 'safe' | 'notice'; caught: number; on: boolean }[] = [
  { id: 'passwords', Icon: StickyNote, risk: 'safe', caught: 1, on: true },
  { id: 'album', Icon: Images, risk: 'safe', caught: 0, on: true },
  { id: 'chat', Icon: MessagesSquare, risk: 'safe', caught: 0, on: true },
  { id: 'bank', Icon: Landmark, risk: 'notice', caught: 0, on: true },
  { id: 'contact', Icon: Contact, risk: 'notice', caught: 0, on: false },
];

export function Bait(props: ScreenProps) {
  const { t } = useI18n();
  const b = t.bait;
  const [on, setOn] = useState<Record<BaitId, boolean>>(
    () => Object.fromEntries(BAITS.map((x) => [x.id, x.on])) as Record<BaitId, boolean>,
  );

  return (
    <Shell {...props} tab="vault" header={{ kind: 'back', label: b.label, backTo: 'vault' }}>
      <section className="card card--alert" aria-labelledby="bait-h">
        <div className="alert__head">
          <span className="row__icon row__icon--act" aria-hidden="true">
            <Fish size={20} />
          </span>
          <div>
            <h1 className="h2" id="bait-h" tabIndex={-1}>
              {b.alertTitle}
            </h1>
            <p className="card__sub">{b.alertTime}</p>
          </div>
        </div>

        <h2 className="sr-only">{b.savedHeading}</h2>
        <div className="evidence">
          <figure className="evidence__photo">
            <div className="blurred-wrap" role="img" aria-label={b.photoAlt}>
              <div className="blurred" />
            </div>
            <figcaption>
              <Camera size={14} aria-hidden="true" /> {b.photoTaken}
            </figcaption>
          </figure>
          <ul className="evidence__facts" role="list">
            <li>
              <KeyRound size={16} aria-hidden="true" />
              {b.wrongPin}
            </li>
            <li>
              <Timer size={16} aria-hidden="true" />
              {b.openFor}
            </li>
          </ul>
        </div>
        <p className="reassure">
          <ShieldCheck size={16} aria-hidden="true" />
          {b.note}
        </p>
      </section>

      <h2 className="h3">{b.yourBaits}</h2>
      <ul className="bait-list" role="list">
        {BAITS.map(({ id, Icon, risk, caught }) => {
          const item = b.items[id];
          const isOn = on[id];
          const statusText = !isOn ? b.off : caught > 0 ? fill(b.caught, { n: caught }) : b.watching;
          const statusKind = !isOn ? 'off' : caught > 0 ? 'act' : 'safe';
          return (
            <li key={id} className={`bait${isOn ? '' : ' is-off'}`}>
              <span className="icon-chip" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="bait__text">
                <span className="bait__name">{item.name}</span>
                <span className="bait__desc">{item.desc}</span>
                <span className="bait__meta">
                  <span className={`status status--${statusKind}`}>
                    <span className={`dot dot--${statusKind}`} aria-hidden="true" />
                    {statusText}
                  </span>
                  <RiskPill risk={risk} />
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-label={item.name}
                className="switch"
                onClick={() => setOn((s) => ({ ...s, [id]: !s[id] }))}
              >
                <span className="switch__knob" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <button type="button" className="btn btn--outline btn--block" onClick={() => props.toast(b.plantToast)}>
        <Plus size={18} aria-hidden="true" />
        <span>{b.plant}</span>
      </button>
    </Shell>
  );
}
