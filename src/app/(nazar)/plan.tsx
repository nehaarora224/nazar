import {
  ArchiveIcon,
  CheckCircleIcon,
  CheckIcon,
  CircleIcon,
  HandHeartIcon,
  HeartIcon,
  Icon,
  LockSimpleIcon,
  PathIcon,
} from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { MainHeader, NoticePill } from '../../components/ui';
import { TKey, useT } from '../../i18n';
import { useStore } from '../../store';
import { colors, fonts, type } from '../../theme';

type Stage = { title: TKey; waitingLabel: TKey; icon: Icon; actions: { text: TKey; mayNotice?: boolean }[] };

/** Safe order: preserve evidence, then reach people, then lock things down. */
const STAGES: Stage[] = [
  { title: 'plan.preserve', waitingLabel: 'plan.soon', icon: ArchiveIcon, actions: [{ text: 'plan.a00' }, { text: 'plan.a01' }] },
  { title: 'plan.support', waitingLabel: 'plan.soon', icon: HandHeartIcon, actions: [{ text: 'plan.a10' }, { text: 'plan.a11' }] },
  {
    title: 'plan.secure',
    waitingLabel: 'plan.whenReady',
    icon: LockSimpleIcon,
    actions: [
      { text: 'plan.a20', mayNotice: true },
      { text: 'plan.a21', mayNotice: true },
    ],
  },
];

/** Screen 07 — Safe Order Action Plan. */
export default function Plan() {
  const {
    data: { planDone },
    togglePlanStep,
  } = useStore();
  const { t } = useT();
  const stageDone = (si: number) => STAGES[si].actions.every((_, ai) => planDone[`${si}-${ai}`]);

  return (
    <Screen gap={14} header={<MainHeader />}>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PathIcon size={16} color={colors.primary} />
          <Text style={[type.label, { fontSize: 14, color: colors.primary }]}>{t('plan.label')}</Text>
        </View>
        <Text style={type.display} accessibilityRole="header">
          {t('plan.heading')}
        </Text>
      </View>

      <View style={styles.banner}>
        <HeartIcon size={20} weight="fill" color={colors.tealDeep} />
        <Text style={styles.bannerText}>
          <Text style={{ fontFamily: fonts.semibold }}>{t('plan.bannerBold')}</Text> {t('plan.bannerRest')}
        </Text>
      </View>

      <View>
        {STAGES.map((st, si) => {
          const done = stageDone(si);
          const current = !done && STAGES.slice(0, si).every((_, pi) => stageDone(pi));
          const last = si === STAGES.length - 1;
          const StageIcon = done ? CheckIcon : st.icon;
          return (
            <View key={st.title} style={styles.stage}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.node,
                    done && { backgroundColor: colors.safe },
                    current && { backgroundColor: colors.primary, boxShadow: '0px 0px 0px 5px rgba(75,63,160,0.15)' },
                    !done && !current && styles.nodeWaiting,
                  ]}
                >
                  <StageIcon size={15} weight={done ? 'bold' : 'regular'} color={done || current ? colors.onPrimary : colors.muted} />
                </View>
                <View
                  style={[
                    styles.line,
                    { backgroundColor: last ? 'transparent' : done ? colors.safeLine : 'rgba(46,38,112,0.14)' },
                  ]}
                />
              </View>

              <View style={styles.stageBody}>
                <View style={styles.stageHead}>
                  <Text style={type.title}>{t(st.title)}</Text>
                  <View
                    style={[
                      styles.meta,
                      { backgroundColor: done ? colors.safeBg : current ? colors.lavender : colors.offBg },
                    ]}
                  >
                    <Text style={[type.pill, { color: done ? colors.safeFg : current ? colors.primaryDeep : colors.muted }]}>
                      {done ? t('plan.done') : current ? t('plan.next') : t(st.waitingLabel)}
                    </Text>
                  </View>
                </View>

                {st.actions.map((a, ai) => {
                  const key = `${si}-${ai}`;
                  const ticked = !!planDone[key];
                  return (
                    <Pressable
                      key={key}
                      onPress={() => togglePlanStep(key)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: ticked }}
                      accessibilityLabel={`${t(a.text)}. ${a.mayNotice ? t('pill.mayNotice') : t('pill.safe')}`}
                      style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}
                    >
                      {ticked ? (
                        <CheckCircleIcon size={20} weight="fill" color={colors.safe} />
                      ) : (
                        <CircleIcon size={20} color={colors.checkOff} />
                      )}
                      <Text style={[type.bodyInk, { flex: 1 }]}>{t(a.text)}</Text>
                      <NoticePill mayNotice={a.mayNotice} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 18,
    backgroundImage: 'linear-gradient(120deg, #E3EFEC 0%, #ECE8F7 100%)',
  },
  bannerText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.primaryNight },
  stage: { flexDirection: 'row', gap: 12 },
  rail: { width: 32, alignItems: 'center' },
  node: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nodeWaiting: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: 'rgba(46,38,112,0.18)' },
  line: { flex: 1, width: 2, minHeight: 12, marginVertical: 4 },
  stageBody: { flex: 1, minWidth: 0, gap: 7, paddingBottom: 14 },
  stageHead: { height: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: colors.surface,
    boxShadow: '0px 6px 16px -12px rgba(46,38,112,0.35)',
  },
});
