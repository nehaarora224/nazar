import { CameraIcon, CaretDownIcon, GearSixIcon, Icon, MapPinIcon, MicrophoneIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { SaveToVaultButton } from '../../components/SaveToVault';
import { card, Choice, IconChip, InfoBox, NoteInput, PageTitle, Pill, PrimaryButton, SampleBadge, SampleBanner, SecondaryButton, SectionTitle, SubHeader, TonalButton } from '../../components/ui';
import { TKey, useT } from '../../i18n';
import type { Sampled } from '../../sample';
import { latestQuiet, QuietArea, QuietEntry, useStore } from '../../store';
import { QUIET_AREAS, quietState, useView } from '../../view';
import { canOpenSystemSettings, openSystemSettings, platformKind } from '../../systemSettings';
import { colors, radius, space, type } from '../../theme';

const AREA_ICON: Record<QuietArea, Icon> = { mic: MicrophoneIcon, camera: CameraIcon, location: MapPinIcon };

/**
 * Quiet Check: a guided privacy review. The OS doesn't let one app read another app's
 * microphone, camera or location use, so Nazar points to the phone's own records and keeps
 * a timeline of what she noted. It never records audio, video or location itself.
 */
export default function QuietCheck() {
  const { data } = useStore();
  const v = useView();
  const { t } = useT();
  const realDone = QUIET_AREAS.filter((a) => latestQuiet(data.quietEntries, a)).length;
  const s = quietState(data, v);
  const overall =
    realDone === 0 ? t('quiet.overall.notStarted') : realDone < 3 ? t('quiet.overall.inProgress', { done: realDone }) : t('quiet.overall.done');
  const entries = [...v.quietEntries].sort((a, b) => b.at - a.at);

  return (
    <Screen header={<SubHeader title={t('quiet.title')} />}>
      <PageTitle kicker={t('quiet.sub')} title={t('quiet.title')} sub={t('quiet.intro')} />
      <SampleBanner />
      <Pill t={realDone && s.review && !s.sample ? 'look' : realDone === 3 ? 'safe' : 'off'} label={overall} style={{ alignSelf: 'flex-start' }} />
      {platformKind === 'web' && <InfoBox kind="warn" body={t('quiet.webNote')} />}

      {QUIET_AREAS.map((a) => (
        <AreaCard key={a} area={a} latest={latestQuiet(data.quietEntries, a) ?? latestQuiet(v.quietEntries, a)} />
      ))}

      <SectionTitle>{t('quiet.timeline')}</SectionTitle>
      <Text style={[type.body, { fontSize: 14 }]}>{t('quiet.timelineNote')}</Text>
      {entries.length === 0 ? (
        <Text style={type.body}>{t('quiet.timelineEmpty')}</Text>
      ) : (
        <View style={styles.timeline}>
          {entries.map((e, i) => (
            <TimelineEntry key={e.id} entry={e} last={i === entries.length - 1} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function AreaCard({ area, latest }: { area: QuietArea; latest?: QuietEntry & Sampled }) {
  const { addQuietEntry } = useStore();
  const { t, when } = useT();
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const [choice, setChoice] = useState<'ok' | 'review' | null>(null);
  const [note, setNote] = useState('');
  const os = platformKind === 'ios' ? 'ios' : 'android';
  const name = t(`quiet.${area}` as TKey);

  const state =
    platformKind === 'web' && !latest
      ? { t: 'off' as const, label: t('quiet.state.na') }
      : !latest
        ? { t: 'off' as const, label: t('quiet.state.notStarted') }
        : latest.status === 'ok'
          ? { t: 'safe' as const, label: t('quiet.state.ok') }
          : { t: 'look' as const, label: t('quiet.state.review') };

  const save = () => {
    if (!choice) return;
    addQuietEntry(area, choice, note.trim() || undefined);
    setOpen(false);
    setChoice(null);
    setNote('');
  };

  return (
    <View style={styles.area}>
      <View style={styles.areaHead}>
        <IconChip icon={AREA_ICON[area]} size={42} radius={14} iconSize={21} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={type.title}>{name}</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Pill t={state.t} label={state.label} />
            {latest?.sample && <SampleBadge />}
          </View>
        </View>
      </View>
      {latest && <Text style={[type.body, { fontSize: 13 }]}>{`${latest.sample ? t('sample.example') : t('common.recordedByYou')} · ${when(latest.at)}`}</Text>}
      <Text style={type.bodyInk}>{t(`quiet.${area}.why` as TKey)}</Text>

      <View style={styles.kv}>
        <Text style={type.overline}>{t('quiet.permLabel')}</Text>
        <Text style={type.bodyInk}>{t('quiet.permValue')}</Text>
      </View>
      <Pressable
        onPress={() => setGuide((g) => !g)}
        accessibilityRole="button"
        accessibilityState={{ expanded: guide }}
        style={styles.toggle}
      >
        <Text style={[type.label, { flex: 1, color: colors.primary }]}>{t('quiet.howTo')}</Text>
        <CaretDownIcon size={16} weight="bold" color={colors.primary} style={guide ? { transform: [{ rotate: '180deg' }] } : undefined} />
      </Pressable>
      {guide && (
        <>
          <View style={styles.kv}>
            <Text style={type.overline}>{t('quiet.signal')}</Text>
            <Text style={type.bodyInk}>{t(`quiet.${area}.signal.${os}` as TKey)}</Text>
          </View>
          <View style={styles.kv}>
            <Text style={type.overline}>{t('quiet.howTo')}</Text>
            <Text style={[type.bodyInk, { lineHeight: 23 }]}>{t(`quiet.${area}.steps.${os}` as TKey)}</Text>
          </View>
        </>
      )}

      {canOpenSystemSettings && (
        <SecondaryButton
          icon={GearSixIcon}
          label={area === 'location' ? t('quiet.openLocation') : t('quiet.openSettings')}
          onPress={() => openSystemSettings(area === 'location' ? 'location' : 'privacy')}
        />
      )}

      {open ? (
        <View style={{ gap: space.sm }}>
          <Text style={type.label}>{t('quiet.record')}</Text>
          <Choice label={t('quiet.ok')} t="safe" selected={choice === 'ok'} onPress={() => setChoice('ok')} />
          <Choice label={t('quiet.review')} t="look" selected={choice === 'review'} onPress={() => setChoice('review')} />
          {choice === 'review' && <NoteInput value={note} onChange={setNote} placeholder={t('quiet.notePlaceholder')} />}
          <PrimaryButton label={t('quiet.save')} disabled={!choice} onPress={save} />
          <TonalButton label={t('common.cancel')} onPress={() => setOpen(false)} />
        </View>
      ) : (
        <PrimaryButton label={t('quiet.record')} onPress={() => setOpen(true)} />
      )}
    </View>
  );
}

/** One recorded observation. Tap to expand what it may and may not mean. */
function TimelineEntry({ entry, last }: { entry: QuietEntry & Sampled; last: boolean }) {
  const v = useView();
  const { t, when } = useT();
  const [open, setOpen] = useState(false);
  const review = entry.status === 'review';
  const saved = v.isSaved('quiet', entry.id);

  return (
    <View style={styles.tlRow}>
      <View style={styles.tlRail}>
        <View style={[styles.tlDot, { backgroundColor: review ? colors.look : colors.safe }]} />
        {!last && <View style={styles.tlLine} />}
      </View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.tlCard, pressed && { backgroundColor: colors.lavenderSoft }]}
      >
        <Text style={type.label}>
          {t(`quiet.${entry.area}` as TKey)} · {review ? t('quiet.state.review') : t('quiet.state.ok')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Text style={[type.body, { fontSize: 13 }]}>{when(entry.at)}</Text>
          {entry.sample && <SampleBadge />}
        </View>
        {entry.note && <Text style={type.bodyInk}>“{entry.note}”</Text>}
        {open && (
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            <Detail title={t('quiet.find.observed')} body={entry.note ? `${review ? t('quiet.find.reviewBody') : t('quiet.find.okBody')} “${entry.note}”` : review ? t('quiet.find.reviewBody') : t('quiet.find.okBody')} />
            <Detail title={t('quiet.find.when')} body={when(entry.at)} />
            {review && <Detail title={t('quiet.find.mean')} body={t('quiet.find.meanBody')} />}
            <Detail title={t('quiet.find.cannot')} body={t('quiet.find.cannotBody')} />
            {review && <Detail title={t('quiet.find.next')} body={t('quiet.find.nextBody')} />}
            {review && !entry.sample && <SaveToVaultButton saved={saved} item={{ kind: 'quiet', refId: entry.id, eventAt: entry.at, area: entry.area, note: entry.note }} />}
            {entry.sample && <Text style={[type.body, { fontSize: 14 }]}>{t('sample.readonly')}</Text>}
          </View>
        )}
      </Pressable>
    </View>
  );
}

function Detail({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={type.overline}>{title}</Text>
      <Text style={type.bodyInk}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { ...card, padding: space.lg, gap: space.md },
  areaHead: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  kv: { gap: 2 },
  toggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeline: { gap: 0 },
  tlRow: { flexDirection: 'row', gap: space.md },
  tlRail: { width: 14, alignItems: 'center', paddingTop: 18 },
  tlDot: { width: 12, height: 12, borderRadius: 6 },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
  tlCard: { flex: 1, ...card, borderRadius: radius.md, padding: 14, gap: 3, marginBottom: space.sm, boxShadow: 'none' },
});
