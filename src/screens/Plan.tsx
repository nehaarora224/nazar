import { useState } from 'react';
import { Check, HeartHandshake, Lock, Heart } from 'lucide-react';
import { useI18n } from '../i18n';
import { fill } from '../strings';
import { Shell } from '../components/Shell';
import { RiskPill } from '../components/Pill';
import type { ScreenProps } from '../types';

type StepId = 's1' | 's2' | 's3' | 's4' | 's5' | 's6';
type StageId = 'preserve' | 'support' | 'secure';

const STAGES: { id: StageId; steps: { id: StepId; risk: 'safe' | 'notice' }[] }[] = [
  { id: 'preserve', steps: [{ id: 's1', risk: 'safe' }, { id: 's2', risk: 'safe' }] },
  { id: 'support', steps: [{ id: 's3', risk: 'safe' }, { id: 's4', risk: 'safe' }] },
  { id: 'secure', steps: [{ id: 's5', risk: 'notice' }, { id: 's6', risk: 'notice' }] },
];

export function Plan(props: ScreenProps) {
  const { t } = useI18n();
  const p = t.plan;
  const [done, setDone] = useState<Record<StepId, boolean>>({
    s1: true, s2: true, s3: false, s4: false, s5: false, s6: false,
  });

  const stageDone = (s: (typeof STAGES)[number]) => s.steps.every((x) => done[x.id]);
  const nextIdx = STAGES.findIndex((s) => !stageDone(s));
  const total = STAGES.reduce((n, s) => n + s.steps.length, 0);
  const count = Object.values(done).filter(Boolean).length;

  return (
    <Shell {...props} tab="plan" header={{ kind: 'brand' }}>
      <p className="eyebrow">{p.label}</p>
      <h1 className="h1" tabIndex={-1}>
        {p.heading}
      </h1>

      <p className="banner">
        <Heart size={18} aria-hidden="true" className="banner__icon" />
        <span>
          <strong>{p.bannerStrong}</strong> {p.bannerRest}
        </span>
      </p>

      <p className="note" aria-live="polite">
        {fill(p.progress, { d: count, t: total })}
      </p>

      <ol className="stepper" role="list">
        {STAGES.map((stage, i) => {
          const isDone = stageDone(stage);
          const state = isDone ? 'done' : i === nextIdx ? 'next' : 'later';
          const stateLabel = state === 'done' ? p.done : state === 'next' ? p.next : p.later;
          const StageIcon = state === 'done' ? Check : stage.id === 'secure' ? Lock : HeartHandshake;
          return (
            <li key={stage.id} className={`stage stage--${state}`}>
              <div className="stage__head">
                <span className="stage__badge" aria-hidden="true">
                  <StageIcon size={16} />
                </span>
                <h2 className="stage__title">{p.stages[stage.id]}</h2>
                <span className="stage__state">{stateLabel}</span>
              </div>
              <ul className="stage__steps" role="list">
                {stage.steps.map((step) => (
                  <li key={step.id}>
                    <label className={`step${done[step.id] ? ' is-done' : ''}`}>
                      <input
                        type="checkbox"
                        checked={done[step.id]}
                        onChange={() => setDone((d) => ({ ...d, [step.id]: !d[step.id] }))}
                      />
                      <span className="step__box" aria-hidden="true">
                        <Check size={14} />
                      </span>
                      <span className="step__text">{p.steps[step.id]}</span>
                      <RiskPill risk={step.risk} />
                    </label>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </Shell>
  );
}
