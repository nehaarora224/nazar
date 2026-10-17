import type { ReactNode } from 'react';
import { ArrowLeft, LogOut, Home, Eye, Lock, ListChecks, Phone as PhoneIcon, Siren, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';
import { fill } from '../strings';
import type { ScreenId, ScreenProps } from '../types';

type Tab = 'dashboard' | 'exposure' | 'vault' | 'plan';

type Header =
  | { kind: 'brand' }
  | { kind: 'back'; label: ReactNode; backTo: ScreenId; badge?: ReactNode };

type Props = Pick<ScreenProps, 'nav' | 'quickExit'> & {
  tab?: Tab;
  header: Header;
  children: ReactNode;
};

/**
 * Layout for every unlocked Nazar screen:
 * header with Quick exit · scrollable content · helpline row · tab bar.
 */
export function Shell({ tab, header, children, nav, quickExit }: Props) {
  const { t } = useI18n();

  const tabs: { id: Tab; label: string; Icon: typeof Home }[] = [
    { id: 'dashboard', label: t.common.tabs.home, Icon: Home },
    { id: 'exposure', label: t.common.tabs.exposure, Icon: Eye },
    { id: 'vault', label: t.common.tabs.vault, Icon: Lock },
    { id: 'plan', label: t.common.tabs.plan, Icon: ListChecks },
  ];

  return (
    <div className="shell">
      <header className="shell__header">
        {header.kind === 'brand' ? (
          <span className="brand">
            <ShieldCheck size={22} aria-hidden="true" />
            <span className="brand__name">{t.common.appName}</span>
          </span>
        ) : (
          <span className="shell__back">
            <button type="button" className="icon-btn" onClick={() => nav(header.backTo)} aria-label={t.common.back}>
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <span className="shell__label">{header.label}</span>
          </span>
        )}
        <span className="shell__header-end">
          {header.kind === 'back' && header.badge}
          <button type="button" className="quick-exit" onClick={quickExit} aria-label={t.common.quickExitLabel}>
            <LogOut size={16} aria-hidden="true" />
            <span>{t.common.quickExit}</span>
          </button>
        </span>
      </header>

      <div className="shell__content">{children}</div>

      <div className="helplines" role="group" aria-label={t.common.helplinesLabel}>
        <a className="helpline" href="tel:181" aria-label={fill(t.common.callLabel, { n: 181, name: t.common.helpline })}>
          <span className="helpline__icon helpline__icon--sage" aria-hidden="true">
            <PhoneIcon size={15} />
          </span>
          <span className="helpline__num">181</span>
          <span className="helpline__name">{t.common.helpline}</span>
        </a>
        <a className="helpline" href="tel:112" aria-label={fill(t.common.callLabel, { n: 112, name: t.common.emergency })}>
          <span className="helpline__icon helpline__icon--terra" aria-hidden="true">
            <Siren size={15} />
          </span>
          <span className="helpline__num">112</span>
          <span className="helpline__name">{t.common.emergency}</span>
        </a>
      </div>

      <nav className="tabbar" aria-label={t.common.tabsLabel}>
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`tabbar__item${tab === id ? ' is-active' : ''}`}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => nav(id)}
          >
            <span className="tabbar__icon" aria-hidden="true">
              <Icon size={20} />
            </span>
            <span className="tabbar__label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
