import { router } from 'expo-router';
import { AppWindowIcon, GearSixIcon, LockSimpleIcon, PersonArmsSpreadIcon, ShieldCheckIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useConfirmSave } from '../../components/SaveToVault';
import { Screen } from '../../components/Screen';
import { InfoBox, ListCard, ListRow, PageTitle, PrimaryButton, SecondaryButton, SectionTitle, StatusLine, SubHeader } from '../../components/ui';
import { TKey, useT } from '../../i18n';
import { canOpenSystemSettings, openSystemSettings } from '../../systemSettings';
import { Tone, type } from '../../theme';
import {
  AuditSummary,
  getPermissionAudit,
  isPermissionAuditAvailable,
  packageOf,
  RawAudit,
  Signal,
  SignalKey,
  summarize,
} from '../../../modules/permission-audit';

const LIST_SIGNALS: SignalKey[] = ['accessibility', 'notificationListeners', 'deviceAdmins'];
const FLAG_SIGNALS: SignalKey[] = ['developerOptions', 'adb'];
const SIGNAL_KEY: Record<SignalKey, TKey> = {
  accessibility: 'pa.sig.accessibility',
  notificationListeners: 'pa.sig.notif',
  deviceAdmins: 'pa.sig.admin',
  developerOptions: 'pa.sig.dev',
  adb: 'pa.sig.adb',
};

type Phase = 'idle' | 'running' | 'done' | 'error';

/** Read-only Android permission & settings audit. Needs the native app; honest fallback elsewhere. */
export default function PermissionAudit() {
  const { t } = useT();
  const confirmSave = useConfirmSave();
  const [phase, setPhase] = useState<Phase>('idle');
  const [sum, setSum] = useState<AuditSummary | null>(null);
  const [raw, setRaw] = useState<RawAudit | null>(null);
  const [saved, setSaved] = useState(false);
  const available = isPermissionAuditAvailable();

  // Save a point-in-time snapshot of this device-state check into the encrypted Vault. Each save is
  // its own record (unique refId), so re-running and re-saving keeps a history rather than clobbering.
  const saveCheck = (s: AuditSummary) => {
    const flagged = s.signals.filter((sig) => sig.review).map((sig) => t(SIGNAL_KEY[sig.key]));
    const summary = flagged.length ? flagged.join(', ') : t('ec.s.permNone');
    confirmSave(
      {
        kind: 'permaudit',
        refId: `pa-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        eventAt: Date.now(),
        title: t('pa.saveTitle'),
        summary,
        limitations: t('pa.saveLimits'),
      },
      { title: t('pa.saveTitle'), body: t('pa.saveLimits'), onSaved: () => setSaved(true) },
    );
  };

  const run = async () => {
    setPhase('running');
    try {
      const r = await getPermissionAudit();
      setRaw(r);
      setSum(summarize(r));
      setPhase('done');
    } catch {
      setPhase('error');
    }
  };

  return (
    <Screen header={<SubHeader title={t('pa.title')} onBack={() => router.navigate('/digital-footprint-audit')} />}>
      <PageTitle title={t('pa.title')} sub={t('pa.intro')} />

      {!available ? (
        <InfoBox kind="warn" title={t('pa.needAppTitle')} body={t('pa.needApp')} />
      ) : (
        <>
          <InfoBox body={t('pa.noPermsNote')} />
          {phase !== 'done' && (
            <PrimaryButton icon={ShieldCheckIcon} label={phase === 'running' ? t('pa.running') : t('pa.run')} onPress={run} disabled={phase === 'running'} />
          )}
          {phase === 'error' && <InfoBox kind="error" body={t('pa.error')} />}
          {phase === 'done' && sum && raw && (
            <>
              <SectionTitle>{t('pa.verifiedTitle')}</SectionTitle>

              <ListCard title={t('pa.selfTitle')}>
                <SelfRow first label={t('pa.perm.camera')} on={sum.self.camera} />
                <SelfRow label={t('pa.perm.microphone')} on={sum.self.microphone} />
                <SelfRow label={t('pa.perm.location')} on={sum.self.location} />
                <SelfRow label={t('pa.perm.overlay')} on={sum.self.overlay} />
              </ListCard>
              <Text style={[type.body, { fontSize: 13 }]}>{t('pa.selfSub')}</Text>

              <ListCard title={t('pa.flagsTitle')}>
                {FLAG_SIGNALS.map((k, i) => (
                  <FlagRow key={k} first={i === 0} label={t(SIGNAL_KEY[k])} sig={sum.signals.find((s) => s.key === k)!} />
                ))}
              </ListCard>

              {LIST_SIGNALS.map((k) => (
                <ServiceList key={k} title={t(SIGNAL_KEY[k])} sig={sum.signals.find((s) => s.key === k)!} />
              ))}
              <InfoBox kind="warn" body={t('pa.listCaveat')} />

              <PrimaryButton icon={LockSimpleIcon} label={saved ? t('pa.saved') : t('pa.save')} disabled={saved} onPress={() => saveCheck(sum)} />
              <SecondaryButton label={t('pa.rerun')} onPress={() => { setSaved(false); run(); }} />
            </>
          )}
        </>
      )}

      {canOpenSystemSettings && (
        <>
          <SectionTitle>{t('pa.manualTitle')}</SectionTitle>
          <Text style={[type.body, { fontSize: 14 }]}>{t('pa.manualSub')}</Text>
          <View style={{ gap: 8 }}>
            <SecondaryButton icon={AppWindowIcon} label={t('pa.openApps')} onPress={() => openSystemSettings('apps')} />
            <SecondaryButton icon={PersonArmsSpreadIcon} label={t('pa.openAccessibility')} onPress={() => openSystemSettings('accessibility')} />
            <SecondaryButton icon={GearSixIcon} label={t('pa.openPrivacy')} onPress={() => openSystemSettings('privacy')} />
          </View>
        </>
      )}

      <SectionTitle>{t('pa.notShownTitle')}</SectionTitle>
      <InfoBox body={t('pa.notShown')} />
      <InfoBox kind="warn" body={t('pa.notProof')} />
    </Screen>
  );
}

function SelfRow({ label, on, first }: { label: string; on: boolean | null; first?: boolean }) {
  const { t } = useT();
  const tone: Tone = on === null ? 'off' : on ? 'look' : 'safe';
  const text = on === null ? t('pa.unknown') : on ? t('pa.granted') : t('pa.notGranted');
  return <ListRow first={first} icon={ShieldCheckIcon} title={label} status={<StatusLine t={tone} label={text} />} />;
}

function FlagRow({ label, sig, first }: { label: string; sig: Signal; first?: boolean }) {
  const { t } = useT();
  const tone: Tone = sig.present === null ? 'off' : sig.present ? 'look' : 'safe';
  const text = sig.present === null ? t('pa.unknown') : sig.present ? t('pa.on') : t('pa.off');
  return <ListRow first={first} icon={GearSixIcon} title={label} status={<StatusLine t={tone} label={text} />} />;
}

function ServiceList({ title, sig }: { title: string; sig: Signal }) {
  const { t } = useT();
  if (sig.entries.length === 0) {
    return (
      <ListCard title={title}>
        <ListRow first icon={ShieldCheckIcon} title={t('pa.listNone')} status={<StatusLine t="safe" label={t('pa.off')} />} />
      </ListCard>
    );
  }
  return (
    <ListCard title={title} count={sig.entries.length}>
      {sig.entries.map((e, i) => (
        <ListRow key={e} first={i === 0} icon={ShieldCheckIcon} title={packageOf(e)} desc={e} status={<StatusLine t="look" label={t('pa.review')} />} />
      ))}
    </ListCard>
  );
}
