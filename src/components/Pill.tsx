import { useI18n } from '../i18n';
import type { Status } from '../types';

/** Honest risk label: "Safe" (he won't notice) or "May notice" (he might find out). */
export function RiskPill({ risk }: { risk: 'safe' | 'notice' }) {
  const { t } = useI18n();
  const label = risk === 'safe' ? t.common.safe : t.common.mayNotice;
  const hint = risk === 'safe' ? t.common.safeHint : t.common.mayNoticeHint;
  return (
    <span className={`pill pill--${risk}`}>
      <span className="pill__dot" aria-hidden="true" />
      {label}
      <span className="sr-only">, {hint}</span>
    </span>
  );
}

/** Status dot with a text alternative, so meaning never depends on colour alone. */
export function StatusDot({ status }: { status: Status }) {
  const { t } = useI18n();
  return (
    <span className={`dot dot--${status}`} role="img" aria-label={t.common.status[status]} />
  );
}
