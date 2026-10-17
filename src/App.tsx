import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, LayoutPanelLeft, Smartphone, RotateCcw, X } from 'lucide-react';
import { useI18n } from './i18n';
import type { Lang } from './strings';
import { Phone } from './components/Phone';
import { Calculator } from './screens/Calculator';
import { Dashboard } from './screens/Dashboard';
import { Exposure } from './screens/Exposure';
import { Tracker } from './screens/Tracker';
import { Bait } from './screens/Bait';
import { Vault } from './screens/Vault';
import { Plan } from './screens/Plan';
import { SCREEN_ORDER, type Mode, type ScreenId, type ScreenProps } from './types';

function Screen({ id, ...props }: ScreenProps & { id: Exclude<ScreenId, 'calculator'> }) {
  switch (id) {
    case 'dashboard':
      return <Dashboard {...props} />;
    case 'exposure':
      return <Exposure {...props} />;
    case 'tracker':
      return <Tracker {...props} />;
    case 'bait':
      return <Bait {...props} />;
    case 'vault':
      return <Vault {...props} />;
    case 'plan':
      return <Plan {...props} />;
  }
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const [view, setView] = useState<Mode>('pitch');
  const [screen, setScreen] = useState<ScreenId>('calculator');
  const [demoKey, setDemoKey] = useState(0);
  const [toastMsg, setToastMsg] = useState<{ msg: string; id: number } | null>(null);
  const livePhone = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  const toast = useCallback((msg: string) => setToastMsg({ msg, id: Date.now() }), []);

  useEffect(() => {
    if (!toastMsg) return;
    const id = window.setTimeout(() => setToastMsg(null), 4500);
    return () => window.clearTimeout(id);
  }, [toastMsg]);

  const goLive = useCallback((to: ScreenId) => {
    moveFocus.current = true;
    setView('live');
    setScreen(to);
  }, []);

  const quickExit = useCallback(() => {
    moveFocus.current = true;
    setToastMsg(null);
    setView('live');
    setScreen('calculator');
    setDemoKey((k) => k + 1); // fresh calculator, nothing left on screen
  }, []);

  // Escape = Quick exit while Nazar is open in the live demo.
  useEffect(() => {
    if (view !== 'live' || screen === 'calculator') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        quickExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, screen, quickExit]);

  // After navigating in the live demo, move focus to the new screen's heading
  // and reset its scroll, so keyboard and screen-reader users land in the right place.
  useEffect(() => {
    if (view !== 'live' || !moveFocus.current) return;
    moveFocus.current = false;
    requestAnimationFrame(() => {
      const root = livePhone.current;
      root?.querySelector('.shell__content')?.scrollTo({ top: 0 });
      (root?.querySelector('h1') as HTMLElement | null)?.focus({ preventScroll: true });
    });
  }, [view, screen, demoKey]);

  const liveProps: ScreenProps = {
    mode: 'live',
    nav: (to) => {
      moveFocus.current = true;
      setScreen(to);
    },
    quickExit,
    toast,
  };

  const pitchProps: ScreenProps = { mode: 'pitch', nav: goLive, quickExit, toast };

  const caption = (id: ScreenId) => t.pitch.screens[id];

  const langs: { id: Lang; label: string }[] = [
    { id: 'en', label: t.shell.langEn },
    { id: 'hi', label: t.shell.langHi },
  ];

  return (
    <>
      <a className="skip-link" href="#main">
        {t.shell.skip}
      </a>

      <header className="topbar">
        <div className="topbar__brand">
          <ShieldCheck size={22} aria-hidden="true" />
          <div>
            <p className="topbar__name">{t.common.appName}</p>
            <p className="topbar__tag">{t.shell.tagline}</p>
          </div>
        </div>

        <div className="topbar__controls">
          <div className="segmented" role="group" aria-label={t.shell.viewGroup}>
            <button type="button" aria-pressed={view === 'pitch'} onClick={() => setView('pitch')}>
              <LayoutPanelLeft size={16} aria-hidden="true" />
              {t.shell.viewPitch}
            </button>
            <button type="button" aria-pressed={view === 'live'} onClick={() => goLive(screen)}>
              <Smartphone size={16} aria-hidden="true" />
              {t.shell.viewLive}
            </button>
          </div>

          <div className="segmented" role="group" aria-label={t.shell.langGroup}>
            {langs.map((l) => (
              <button
                key={l.id}
                type="button"
                lang={l.id}
                aria-pressed={lang === l.id}
                onClick={() => setLang(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        {view === 'pitch' ? (
          <>
            <p className="hint">{t.shell.pitchHint}</p>
            <section className="strip" aria-label={t.pitch.regionLabel}>
              {SCREEN_ORDER.map((id, i) => {
                const c = caption(id);
                return (
                  <figure className="slot" key={`${id}-${lang}`}>
                    <h2 className="slot__title">
                      <span className="slot__num">{String(i + 1).padStart(2, '0')}</span> {c.title}
                    </h2>
                    <Phone tone={id === 'calculator' ? 'calc' : 'nazar'} label={c.title}>
                      {id === 'calculator' ? (
                        <Calculator mode="pitch" startDemo onUnlock={() => goLive('dashboard')} />
                      ) : (
                        <Screen id={id} {...pitchProps} />
                      )}
                    </Phone>
                    <figcaption className="slot__caption">
                      {c.quote && <span className="slot__quote">{c.quote}</span>}
                      <span>
                        {c.before}
                        {c.action && <strong>{c.action}</strong>}
                        {c.after}
                      </span>
                    </figcaption>
                  </figure>
                );
              })}
            </section>
          </>
        ) : (
          <div className="live">
            <div className="live__phone" ref={livePhone} key={demoKey}>
              <Phone tone={screen === 'calculator' ? 'calc' : 'nazar'} label={caption(screen).title}>
                {screen === 'calculator' ? (
                  <Calculator mode="live" onUnlock={() => liveProps.nav('dashboard')} />
                ) : (
                  <Screen id={screen} {...liveProps} />
                )}
              </Phone>
            </div>

            <aside className="live__panel">
              <p className="hint hint--left">{t.shell.liveHint}</p>
              <h2 className="panel__label">{t.shell.jumpTo}</h2>
              <ol className="jump" role="list">
                {SCREEN_ORDER.map((id, i) => (
                  <li key={id}>
                    <button
                      type="button"
                      aria-current={screen === id ? 'step' : undefined}
                      onClick={() => liveProps.nav(id)}
                    >
                      <span className="slot__num">{String(i + 1).padStart(2, '0')}</span>
                      {caption(id).title}
                    </button>
                  </li>
                ))}
              </ol>
              <button type="button" className="btn btn--ghost" onClick={quickExit}>
                <RotateCcw size={16} aria-hidden="true" />
                {t.shell.reset}
              </button>
              <p className="note">{t.shell.demoNote}</p>
            </aside>
          </div>
        )}
      </main>

      <div className="toast-region" role="status" aria-live="polite">
        {toastMsg && (
          <div className="toast" key={toastMsg.id}>
            <span>{toastMsg.msg}</span>
            <button type="button" className="icon-btn icon-btn--dark" onClick={() => setToastMsg(null)} aria-label={t.shell.toastClose}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
