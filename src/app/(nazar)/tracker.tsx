import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BluetoothIcon, GearSixIcon, HourglassMediumIcon } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { TrackerResultCard as ResultCard } from '../../components/TrackerResultCard';
import { Card, card, Choice, InfoBox, ListCard, ListRow, NoteInput, PageTitle, PrimaryButton, SampleBanner, SecondaryButton, SectionTitle, StatusLine, SubHeader } from '../../components/ui';
import { TKey, useT } from '../../i18n';
import { latestTracker, TrackerResult, TrackerType, useStore } from '../../store';
import { TRACKER_TONE, useView } from '../../view';
import { canOpenSystemSettings, openSystemSettings, platformKind } from '../../systemSettings';
import { colors, space, type } from '../../theme';

const RESULTS: TrackerResult[] = ['none', 'tracker', 'unknown', 'incomplete'];
const TYPES: TrackerType[] = ['airtag', 'smarttag', 'tile', 'other', 'unsure'];

/**
 * Tracker Check. Nazar has no Bluetooth access in this version, so this is an honest guided
 * workflow around the phone's own unknown-tracker scan. Results are what she recorded.
 */
export default function Tracker() {
  const { data, addTrackerEntry } = useStore();
  const { t, when } = useT();
  const [phase, setPhase] = useState<'idle' | 'checking'>('idle');
  const [result, setResult] = useState<TrackerResult | null>(null);
  const [kind, setKind] = useState<TrackerType | null>(null);
  const [note, setNote] = useState('');

  const v = useView();
  const history = [...v.trackerEntries].sort((a, b) => b.at - a.at);
  const latest = latestTracker(data.trackerEntries) ?? latestTracker(v.trackerEntries);
  const params = useLocalSearchParams<{ start?: string }>();
  // Home's "Run tracker check" opens straight into the check, once.
  useFocusEffect(
    useCallback(() => {
      if (params.start !== '1') return;
      setPhase('checking');
      router.setParams({ start: undefined });
    }, [params.start]),
  );
  const os = platformKind;

  const reset = () => {
    setPhase('idle');
    setResult(null);
    setKind(null);
    setNote('');
  };
  const save = () => {
    if (!result) return;
    const id = addTrackerEntry(result, result === 'tracker' ? (kind ?? 'unsure') : undefined, note.trim() || undefined);
    reset();
    router.navigate({ pathname: '/tracker-detail', params: { id } });
  };

  return (
    <Screen header={<SubHeader title={t('trk.title')} />}>
      <PageTitle title={t('trk.title')} sub={t('trk.intro')} />
      <SampleBanner />

      {phase === 'idle' ? (
        <>
          <View style={styles.status}>
            <Text style={type.overline}>{t('trk.status')}</Text>
            <Row label={t('trk.bt')} value={t('trk.btValue')} />
            <Row label={t('trk.scanner')} value={t(`trk.scanner.${os}` as TKey)} />
          </View>
          <InfoBox title={t('trk.supported')} body={t('trk.supportedBody')} />
          <InfoBox kind="warn" title={t('trk.limits')} body={t('trk.limitsBody')} />
          <PrimaryButton icon={BluetoothIcon} label={t('trk.start')} onPress={() => setPhase('checking')} />
        </>
      ) : (
        <>
          <Card>
            <View style={{ gap: space.sm }}>
              <Text style={type.title}>{t('trk.step1')}</Text>
              <Text style={[type.bodyInk, { lineHeight: 23 }]}>
                {os === 'web' ? t('trk.scanner.web') : t(`trk.step1.${os}` as TKey)}
              </Text>
            </View>
          </Card>
          {canOpenSystemSettings && <SecondaryButton icon={GearSixIcon} label={t('trk.openSettings')} onPress={() => openSystemSettings('settings')} />}
          <View style={styles.waiting}>
            <HourglassMediumIcon size={18} color={colors.primary} />
            <Text style={[type.bodyInk, { flex: 1 }]}>{t('trk.waiting')}</Text>
          </View>

          <Text style={[type.label, { marginTop: space.sm }]}>{t('trk.step2')}</Text>
          <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
            {RESULTS.map((r) => (
              <Choice key={r} label={t(`trk.res.${r}` as TKey)} t={TRACKER_TONE[r]} selected={result === r} onPress={() => setResult(r)} />
            ))}
          </View>
          {result === 'tracker' && (
            <View style={{ gap: space.sm }}>
              <Text style={type.label}>{t('trk.type.q')}</Text>
              {TYPES.map((k) => (
                <Choice key={k} label={t(`trk.type.${k}` as TKey)} selected={kind === k} onPress={() => setKind(k)} />
              ))}
            </View>
          )}
          {result && <NoteInput value={note} onChange={setNote} placeholder={t('trk.notePlaceholder')} />}
          <PrimaryButton label={t('trk.save')} disabled={!result} onPress={save} />
          <SecondaryButton label={t('trk.cancel')} onPress={reset} style={{ borderColor: colors.border }} />
        </>
      )}

      {latest && phase === 'idle' && (
        <>
          <SectionTitle>{t('trk.latest')}</SectionTitle>
          <ResultCard entry={latest} />
        </>
      )}
      {history.length === 0 ? (
        <Text style={type.body}>{t('trk.historyEmpty')}</Text>
      ) : (
        <ListCard title={t('trk.history')} count={history.length}>
          {history.map((e, i) => (
            <ListRow
              key={e.id}
              first={i === 0}
              icon={BluetoothIcon}
              title={t(`trk.cls.${e.result}` as TKey)}
              status={<StatusLine t={TRACKER_TONE[e.result]} label={e.sample ? t('sample.example') : t('common.recordedByYou')} sample={e.sample} />}
              desc={e.note ? `“${e.note}”` : undefined}
              meta={when(e.at)}
              onPress={() => router.navigate({ pathname: '/tracker-detail', params: { id: e.id } })}
            />
          ))}
        </ListCard>
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={type.label}>{label}</Text>
      <Text style={type.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { ...card, padding: space.lg, gap: space.md },
  waiting: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: colors.lavenderSoft },
});
