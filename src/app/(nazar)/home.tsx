import { router } from 'expo-router';
import { ArrowClockwiseIcon, BluetoothIcon, CaretRightIcon, CheckCircleIcon, CloudWarningIcon, FishSimpleIcon, PlusIcon, UserCircleIcon, FootprintsIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Screen } from '../../components/Screen';
import { card, IconChip, ListCard, ListRow, MainHeader, PrimaryButton, SampleBadge, SecondaryButton, Skeleton, StatTile, StatusLine, TonalButton } from '../../components/ui';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { colors, fonts, radius, type } from '../../theme';
import { accountState, baitSummary, auditState, trackerState, useView } from '../../view';

const C = 2 * Math.PI * 44;

function greetingKey() {
  const h = new Date().getHours();
  return h < 12 ? 'greet.morning' : h < 17 ? 'greet.afternoon' : 'greet.evening';
}

/** Home: summary ring, the Bait Test, and the three checks. */
export default function Home() {
  const { data, status } = useStore();
  const v = useView();
  const { t, when } = useT();

  const acct = accountState(data, v);
  const audit = auditState(data, v);
  const trk = trackerState(data, v);
  const states = [acct, audit, trk];
  const clear = states.filter((s) => s.clear).length;
  const review = states.filter((s) => s.review).length;
  const anyChecked = states.some((s) => s.tone !== 'off' || s.clear);
  const loading = status === 'loading';

  const ring =
    loading
      ? { pct: 0.12, faded: true, value: '…', title: t('home.ring.loading'), sub: t('home.ring.loadingSub') }
      : status === 'error'
        ? { pct: 0, value: '–', title: t('home.ring.error'), sub: t('home.ring.errorSub') }
        : !anyChecked
          ? { pct: 0, value: '0', title: t('home.ring.empty'), sub: t('home.ring.emptySub') }
          : { pct: clear / 3, value: String(clear), title: review ? t('home.ring.review') : t('home.ring.clear'), sub: t('home.ring.sub', { clear, review }) };
  const ringSample = !loading && states.some((s) => s.sample);

  return (
    <Screen header={<MainHeader />}>
      <View style={{ gap: 6 }}>
        <Text style={styles.kicker}>{t(greetingKey())}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {t('home.heading')}
        </Text>
        <Text style={[type.body, { lineHeight: 22, maxWidth: 330 }]}>{t('home.sub')}</Text>
      </View>

      <View style={styles.summary} accessibilityLabel={`${ring.title}. ${ring.sub}`}>
        <View style={styles.ring}>
          <Svg width={104} height={104} viewBox="0 0 104 104" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Defs>
              <LinearGradient id="nzRing" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.primary} />
                <Stop offset="1" stopColor={colors.teal} />
              </LinearGradient>
            </Defs>
            <Circle cx={52} cy={52} r={44} fill="none" stroke="rgba(75,63,160,0.11)" strokeWidth={10} />
            <Circle
              cx={52}
              cy={52}
              r={44}
              fill="none"
              stroke="url(#nzRing)"
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - Math.max(ring.pct, 0.001))}
              opacity={ring.faded ? 0.35 : 1}
            />
          </Svg>
          <Text style={styles.ringValue}>{ring.value}</Text>
          <Text style={styles.ringUnit}>{t('home.ring.unit')}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text style={styles.summaryTitle}>{ring.title}</Text>
          <Text style={[type.body, { lineHeight: 21 }]}>{ring.sub}</Text>
          {ringSample && <SampleBadge />}
        </View>
      </View>

      <BaitCard />

      <ListCard title={t('home.checks')} count={3}>
        {loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} height={64} style={{ marginHorizontal: 16, marginVertical: 8 }} />)
        ) : (
          <>
            <ListRow
              first
              icon={UserCircleIcon}
              title={t('acctCard.title')}
              status={<StatusLine t={acct.tone} label={t(acct.key, acct.params)} sample={acct.sample} />}
              desc={t('acctCard.desc')}
              onPress={() => router.navigate('/accounts')}
              label={`${t('acctCard.title')}. ${t(acct.key, acct.params)}`}
            />
            <ListRow
              icon={FootprintsIcon}
              title={t('afCard.title')}
              status={<StatusLine t={audit.tone} label={t(audit.key, audit.params)} sample={audit.sample} />}
              desc={t('afCard.desc')}
              onPress={() => router.navigate('/digital-footprint-audit')}
              label={`${t('afCard.title')}. ${t(audit.key, audit.params)}`}
            />
            <ListRow
              icon={BluetoothIcon}
              title={t('trackerCard.title')}
              status={
                <StatusLine
                  t={trk.tone}
                  label={trk.entry ? `${t(trk.key)} · ${when(trk.entry.at)}` : t(trk.key)}
                  sample={trk.sample}
                />
              }
              desc={t('trackerCard.desc')}
              onPress={() => router.navigate('/tracker')}
              label={`${t('trackerCard.title')}. ${t(trk.key)}`}
              action={<TonalButton icon={BluetoothIcon} label={t('trk.action')} onPress={() => router.navigate({ pathname: '/tracker', params: { start: '1' } })} />}
            />
          </>
        )}
      </ListCard>
    </Screen>
  );
}

/** The Bait Test card from the Home design. Real and sample activity, never invented. */
function BaitCard() {
  const { status, retryLoad } = useStore();
  const v = useView();
  const { t, time } = useT();
  const s = baitSummary(v);
  const latestBait = s.latest && v.baitOf(s.latest.baitId);
  const open = () => router.navigate('/bait');
  const create = () => router.navigate('/bait-new');

  return (
    <View style={styles.bait}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${t('baitW.title')}. ${t('baitW.sub')}`} style={({ pressed }) => [styles.baitHead, pressed && { backgroundColor: colors.warmRow }]}>
        <IconChip icon={FishSimpleIcon} size={42} radius={14} iconSize={21} solid />
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={styles.baitTitle}>{t('baitW.title')}</Text>
          <Text style={[type.body, { fontSize: 14, lineHeight: 19 }]}>{t('baitW.sub')}</Text>
        </View>
        <CaretRightIcon size={16} weight="bold" color={colors.primary} />
      </Pressable>

      <View style={styles.baitBody}>
        {status === 'loading' ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Skeleton height={62} style={{ flex: 1 }} />
              <Skeleton height={62} style={{ flex: 1 }} />
            </View>
            <Skeleton height={44} />
            <Text style={[type.body, { fontSize: 14 }]}>{t('baitW.loading')}</Text>
          </>
        ) : status === 'error' ? (
          <>
            <View style={styles.warn}>
              <CloudWarningIcon size={20} color={colors.lookFg} />
              <Text style={[type.bodyInk, { flex: 1 }]}>{t('baitW.error')}</Text>
            </View>
            <SecondaryButton icon={ArrowClockwiseIcon} label={t('common.retry')} onPress={retryLoad} />
          </>
        ) : v.baits.length === 0 ? (
          <>
            <Text style={[type.body, { lineHeight: 22 }]}>{t('baitW.empty')}</Text>
            <PrimaryButton icon={PlusIcon} label={t('baitW.createFirst')} onPress={create} />
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatTile value={s.active.length} label={t('baitW.activeBaits')} />
              <StatTile value={s.today.length} label={t('baitW.openedToday')} alert={s.today.length > 0} />
            </View>
            {s.latest && latestBait ? (
              <Pressable
                onPress={() => router.navigate({ pathname: '/bait-detail', params: { id: s.latest!.baitId } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.recent, pressed && { backgroundColor: '#F7F0E6' }]}
              >
                <View style={styles.recentDot} />
                <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[type.overline, { fontSize: 13 }]}>{t('baitW.latest')}</Text>
                    {s.latest.sample && <SampleBadge />}
                  </View>
                  <Text style={type.bodyInk}>
                    {t(s.latest.kind === 'link' ? 'baitW.recentLink' : 'baitW.recentDecoy', { name: latestBait.name, time: time(s.latest.at) })}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 2 }}>
                <CheckCircleIcon size={18} color={colors.safe} />
                <Text style={type.body}>{t('baitW.noEvents')}</Text>
              </View>
            )}
            <SecondaryButton icon={PlusIcon} label={t('baitW.createAnother')} onPress={create} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primary },
  title: { fontFamily: fonts.medium, fontSize: 29, lineHeight: 33, letterSpacing: -0.7, color: colors.ink },
  summary: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundImage: 'linear-gradient(135deg, #FFFDF9 0%, #F3F0FA 100%)',
  },
  ring: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontFamily: fonts.medium, fontSize: 24, lineHeight: 26, letterSpacing: -0.5, color: colors.primaryNight },
  ringUnit: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  summaryTitle: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 23, letterSpacing: -0.2, color: colors.ink },
  bait: { ...card, overflow: 'hidden', boxShadow: '0px 1px 0px rgba(46,38,112,0.04), 0px 18px 36px -24px rgba(46,38,112,0.45)' },
  baitHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, paddingBottom: 12, paddingLeft: 16, paddingRight: 14 },
  baitTitle: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  baitBody: { gap: 10, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2 },
  warn: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: radius.sm, backgroundColor: colors.lookBg },
  recent: {
    minHeight: 56,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.warmRow,
    borderWidth: 1,
    borderColor: 'rgba(31,28,46,0.06)',
  },
  recentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.act, boxShadow: '0px 0px 0px 4px rgba(192,103,90,0.16)' },
});
