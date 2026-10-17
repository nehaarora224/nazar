import { useState } from 'react';
import { Footprints, MapPin, MessageCircle, Image, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { useI18n } from '../i18n';
import { Shell } from '../components/Shell';
import { RiskPill } from '../components/Pill';
import type { ScreenProps, Status } from '../types';

type RowId = 'movement' | 'location' | 'messages' | 'photos';

export function Exposure(props: ScreenProps) {
  const { t } = useI18n();
  const e = t.exposure;
  const [open, setOpen] = useState<RowId | null>(null);

  const rows: { id: RowId; title: string; desc: string; status: Status; Icon: typeof MapPin }[] = [
    { id: 'movement', title: e.movement, desc: e.movementDesc, status: 'act', Icon: Footprints },
    { id: 'location', title: e.location, desc: e.locationDesc, status: 'look', Icon: MapPin },
    { id: 'messages', title: e.messages, desc: e.messagesDesc, status: 'safe', Icon: MessageCircle },
    { id: 'photos', title: e.photos, desc: e.photosDesc, status: 'safe', Icon: Image },
  ];

  return (
    <Shell {...props} tab="exposure" header={{ kind: 'back', label: e.label, backTo: 'dashboard' }}>
      <h1 className="h1" tabIndex={-1}>
        {e.heading}
      </h1>
      <p className="lede">{e.sub}</p>

      {/* Compact summary strip (replaces the decorative radial diagram) */}
      <ul className="chips" role="list" aria-label={e.summaryLabel}>
        {rows.map(({ id, title, status, Icon }) => (
          <li key={id} className={`chip chip--${status}`}>
            <Icon size={15} aria-hidden="true" />
            <span>{title}</span>
            <span className="sr-only">: {t.common.status[status]}</span>
          </li>
        ))}
      </ul>

      <ul className="rows" role="list">
        {rows.map(({ id, title, desc, status, Icon }) => {
          const isMovement = id === 'movement';
          const expanded = open === id;
          const panelId = `exp-panel-${id}`;
          return (
            <li key={id} className={`row row--${status}${expanded ? ' is-open' : ''}`}>
              <button
                type="button"
                className="row__btn"
                onClick={() => (isMovement ? props.nav('tracker') : setOpen(expanded ? null : id))}
                aria-expanded={isMovement ? undefined : expanded}
                aria-controls={isMovement ? undefined : panelId}
              >
                <span className={`row__icon row__icon--${status}`} aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className="row__text">
                  <span className="row__title">{title}</span>
                  <span className="row__desc">{desc}</span>
                  <span className="sr-only">. {t.common.status[status]}</span>
                  {isMovement && <span className="sr-only">. {e.movementAction}</span>}
                </span>
                <span className="row__end" aria-hidden="true">
                  {isMovement ? (
                    <ChevronRight size={20} />
                  ) : status === 'safe' && !expanded ? (
                    <Check size={20} />
                  ) : (
                    <ChevronDown size={20} className={expanded ? 'rot180' : ''} />
                  )}
                </span>
              </button>
              {!isMovement && expanded && (
                <div className="row__panel" id={panelId}>
                  {id === 'location' && (
                    <>
                      <p>{e.locationGuide}</p>
                      <ul className="mini-steps" role="list">
                        <li>
                          <span>{e.locationStep1}</span> <RiskPill risk="safe" />
                        </li>
                        <li>
                          <span>{e.locationStep2}</span> <RiskPill risk="notice" />
                        </li>
                      </ul>
                    </>
                  )}
                  {id === 'messages' && <p>{e.messagesGuide}</p>}
                  {id === 'photos' && <p>{e.photosGuide}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}
