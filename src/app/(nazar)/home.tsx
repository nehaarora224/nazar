import { router } from 'expo-router';
import { BluetoothIcon, CaretRightIcon, FileLockIcon, Icon, LockSimpleIcon, PulseIcon, UserCircleIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useScreenSize } from '../../components/DeviceFrame';
import { Screen } from '../../components/Screen';
import { card, Dot, IconChip, MainHeader } from '../../components/ui';
import { accountSummary, quietSummary, TRACKER_TONE } from '../../derive';
import { TKey, useT } from '../../i18n';
import { baitSummary, latestTracker, useStore } from '../../store';
import { colors, fonts, radius, space, Tone, type } from '../../theme';

/** Home: the hub for Nazar's tools. No scores or gauges — only what has actually been checked. */
export default function Home() {
  const { data } = useStore();
  const { t, tn, when } = useT();
  const { width } = useScreenSize();
  const twoCol = width >= 360;

  const acct = accountSummary(data);
  const acctStatus: [string, Tone] = !acct.started
    ? [t('acctCard.none'), 'off']
    : acct.review > 0
      ? [tn('acctCard.review', acct.review), 'look']
      : acct.done === acct.total
        ? [t('acctCard.clear'), 'safe']
        : [t('acctCard.progress', { done: acct.done, total: acct.total }), 'off'];

  const quiet = quietSummary(data);
  const quietStatus: [string, Tone] =
    quiet.done === 0
      ? [t('quietCard.none'), 'off']
      : quiet.review > 0
        ? [tn('quietCard.review', quiet.review), 'look']
        : quiet.done < 3
          ? [t('quietCard.progress', { done: quiet.done }), 'off']
          : [t('quietCard.done', { when: when(quiet.lastAt) }), 'safe'];

  const trk = latestTracker(data.trackerEntries);
  const trkStatus: [string, Tone] = trk
    ? [t('trackerCard.last', { result: t(`trk.cls.${trk.result}` as TKey), when: when(trk.at) }), TRACKER_TONE[trk.result]]
    : [t('trackerCard.none'), 'off'];

  const ev = data.evidence.length;

  return (
    <Screen header={<MainHeader />} gap={space.md}>
      <View style={styles.intro}>
        <Text style={styles.kicker}>{t('home.kicker')}</Text>
        <Text style={styles.heading} accessibilityRole="header">
          {t('home.heading')}
        </Text>
        <Text style={type.body}>{t('home.sub')}</Text>
      </View>

      <View style={styles.grid}>
        <ToolCard
          icon={UserCircleIcon}
          title={t('acctCard.title')}
          desc={t('acctCard.desc')}
          status={acctStatus}
          onPress={() => router.navigate('/accounts')}
          half={twoCol}
        />
        <ToolCard
          icon={PulseIcon}
          title={t('quietCard.title')}
          desc={t('quietCard.desc')}
          status={quietStatus}
          onPress={() => router.navigate('/quiet-check')}
          half={twoCol}
        />
        <ToolCard
          icon={BluetoothIcon}
          title={t('trackerCard.title')}
          desc={t('trackerCard.desc')}
          status={trkStatus}
          onPress={() => router.navigate('/tracker')}
        />
      </View>

      <BaitWidget />

      <Pressable
        onPress={() => router.navigate('/vault')}
        accessibilityRole="button"
        accessibilityLabel={t('common.opens', { title: t('vault.title') })}
        style={({ pressed }) => [styles.evidence, pressed && { backgroundColor: colors.lavenderSoft }]}
      >
        <IconChip icon={LockSimpleIcon} />
        <View style={{ flex: 1 }}>
          <Text style={type.label}>{t('home.evidence')}</Text>
          <Text style={type.body}>{ev ? tn('home.evidence', ev) : t('home.evidenceEmpty')}</Text>
        </View>
        <CaretRightIcon size={16} weight="bold" color={colors.muted} />
      </Pressable>
    </Screen>
  );
}

function ToolCard({
  icon,
  title,
  desc,
  status,
  onPress,
  half,
}: {
  icon: Icon;
  title: string;
  desc: string;
  status: [string, Tone];
  onPress: () => void;
  half?: boolean;
}) {
  const { t } = useT();
  const [label, tn] = status;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${desc} ${label}`}
      accessibilityHint={t('common.opens', { title })}
      style={({ pressed }) => [styles.tool, half ? styles.half : styles.full, pressed && { backgroundColor: colors.lavenderSoft }]}
    >
      <View style={styles.toolTop}>
        <IconChip icon={icon} size={38} radius={12} iconSize={20} />
        <CaretRightIcon size={15} weight="bold" color={colors.muted} />
      </View>
      <View style={{ gap: 3, flex: 1 }}>
        <Text style={type.label}>{title}</Text>
        <Text style={[type.body, styles.desc]}>{desc}</Text>
      </View>
      <View style={styles.status}>
        <Dot t={tn} size={7} />
        <Text style={[type.pill, { color: tn === 'off' ? colors.muted : undefined, flex: 1 }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

type BaitState = 'a' | 'b' | 'c' | 'd' | 'e';

/** The signature Bait Test widget. Every value comes from stored baits and recorded events. */
function BaitWidget() {
  const { data, status } = useStore();
  const { t, time, when, dur } = useT();
  const s = baitSummary(data);
  const nameOf = (id: string) => data.baits.find((b) => b.id === id)?.name ?? '';

  const state: BaitState =
    status !== 'ready' ? 'e' : s.active.length === 0 ? 'd' : s.today.length > 0 ? 'b' : s.latest ? 'a' : 'c';
  const latestToday = s.today.reduce((m, e) => (e.at > m.at ? e : m), s.today[0]);

  const badge =
    state === 'e'
      ? { label: t('baitW.unavailable'), bg: colors.offBg, fg: colors.muted }
      : s.active.length
        ? { label: t('baitW.active'), bg: colors.primary, fg: colors.onPrimary }
        : { label: t('baitW.inactive'), bg: colors.offBg, fg: colors.muted };

  const body =
    state === 'b'
      ? latestToday.durationMs
        ? t('baitW.b.bodyDur', { time: time(latestToday.at), name: nameOf(latestToday.baitId), d: dur(latestToday.durationMs) })
        : t('baitW.b.body', { time: time(latestToday.at), name: nameOf(latestToday.baitId) })
      : t(`baitW.${state}.body` as TKey);

  const unknown = state === 'e' ? '—' : null;

  return (
    <View style={[styles.bait, state === 'b' && styles.baitAlert]}>
      <Pressable
        onPress={() => router.navigate('/bait')}
        accessibilityRole="button"
        accessibilityLabel={`${t('baitW.label')}. ${badge.label}. ${t(`baitW.${state}.title` as TKey)}. ${body}`}
        accessibilityHint={t('baitW.open')}
        style={({ pressed }) => [styles.baitMain, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.baitHead}>
          <View style={styles.baitIcon}>
            <FileLockIcon size={20} color={colors.onPrimary} />
          </View>
          <Text style={styles.baitLabel}>{t('baitW.label')}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[type.pill, { color: badge.fg, fontSize: 13 }]}>{badge.label}</Text>
          </View>
          <CaretRightIcon size={16} weight="bold" color={colors.primaryDeep} style={{ marginLeft: 'auto' }} />
        </View>

        <View style={{ gap: 4 }}>
          <Text style={[styles.baitTitle, state === 'b' && { color: colors.actFg }]}>{t(`baitW.${state}.title` as TKey)}</Text>
          <Text style={type.bodyInk}>{body}</Text>
        </View>

        <View style={styles.baitStats}>
          <Stat label={t('baitW.statActive')} value={unknown ?? String(s.active.length)} />
          <Stat label={t('baitW.statToday')} value={unknown ?? String(s.today.length)} alert={s.today.length > 0} />
          <Stat label={t('baitW.statLatest')} value={unknown ?? (s.latest ? when(s.latest.at) : t('common.none'))} wide />
        </View>
      </Pressable>

      <Pressable
        onPress={() => router.navigate({ pathname: '/bait-new' })}
        accessibilityRole="button"
        style={({ pressed }) => [styles.baitAction, pressed && { backgroundColor: 'rgba(75,63,160,0.10)' }]}
      >
        <Text style={styles.baitActionText}>{data.baits.length ? t('baitW.setAnother') : t('baitW.setFirst')}</Text>
      </Pressable>
    </View>
  );
}

function Stat({ label, value, alert, wide }: { label: string; value: string; alert?: boolean; wide?: boolean }) {
  return (
    <View style={[styles.stat, wide && { flex: 1.6 }]}>
      <Text style={[styles.statValue, wide && { fontSize: 14 }, alert && { color: colors.actFg }]} numberOfLines={2}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 4, paddingTop: space.xs },
  kicker: { fontFamily: fonts.medium, fontSize: 14, color: colors.primary },
  heading: { fontFamily: fonts.medium, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tool: { ...card, padding: 14, gap: 10, minHeight: 186 },
  half: { flexBasis: '46%', flexGrow: 1 },
  full: { width: '100%', minHeight: 0 },
  toolTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  desc: { fontSize: 14, lineHeight: 19 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bait: {
    borderRadius: radius.lg,
    backgroundColor: colors.lavender,
    borderWidth: 1,
    borderColor: 'rgba(75,63,160,0.18)',
    overflow: 'hidden',
  },
  baitAlert: { borderColor: 'rgba(138,63,53,0.35)' },
  baitMain: { padding: space.lg, gap: 14 },
  baitHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  baitIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  baitLabel: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 1, color: colors.primaryDeep },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  baitTitle: { fontFamily: fonts.medium, fontSize: 19, lineHeight: 24, color: colors.ink },
  baitStats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 10, gap: 2 },
  statValue: { fontFamily: fonts.medium, fontSize: 18, color: colors.ink },
  statLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  baitAction: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(75,63,160,0.15)',
  },
  baitActionText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primary },
  evidence: { ...card, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12, paddingHorizontal: space.lg },
});
