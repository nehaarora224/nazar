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
import { IconChip, NoticePill } from '../../components/ui';
import { useNazar } from '../../state';
import { colors, fonts, type } from '../../theme';

type Stage = { title: string; waitingLabel: string; icon: Icon; actions: { text: string; mayNotice?: boolean }[] };

/** Safe order: preserve evidence, then reach people, then lock things down. */
const STAGES: Stage[] = [
  {
    title: 'Preserve',
    waitingLabel: 'Soon',
    icon: ArchiveIcon,
    actions: [{ text: 'Save screenshots to your Vault' }, { text: 'Export the evidence report' }],
  },
  {
    title: 'Get support',
    waitingLabel: 'Soon',
    icon: HandHeartIcon,
    actions: [{ text: 'Tell one trusted person' }, { text: 'Talk to a counsellor at 181' }],
  },
  {
    title: 'Secure',
    waitingLabel: 'When ready',
    icon: LockSimpleIcon,
    actions: [
      { text: 'Change your Google password', mayNotice: true },
      { text: 'Remove the unknown device', mayNotice: true },
    ],
  },
];

/** Screen 07 — Safe Order Action Plan. */
export default function Plan() {
  const { planDone, togglePlanStep } = useNazar();
  const stageDone = (si: number) => STAGES[si].actions.every((_, ai) => planDone[`${si}-${ai}`]);

  return (
    <Screen
      gap={14}
      header={
        <>
          <IconChip icon={PathIcon} size={40} radius={14} iconSize={20} bg={colors.lavender} />
          <Text style={[type.label, { fontSize: 15, color: colors.muted }]}>Your safe plan</Text>
        </>
      }
    >
      <Text style={type.display}>One gentle step at a time.</Text>

      <View style={styles.banner}>
        <HeartIcon size={20} weight="fill" color={colors.tealDeep} />
        <Text style={styles.bannerText}>
          <Text style={{ fontFamily: fonts.semibold }}>You're not alone.</Text> Thousands of women have taken these same
          steps.
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
                  <Text style={type.title}>{st.title}</Text>
                  <View
                    style={[
                      styles.meta,
                      { backgroundColor: done ? colors.safeBg : current ? colors.lavender : colors.offBg },
                    ]}
                  >
                    <Text style={[type.pill, { color: done ? colors.safeFg : current ? colors.primaryDeep : colors.muted }]}>
                      {done ? 'Done' : current ? 'Next' : st.waitingLabel}
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
                      accessibilityLabel={`${a.text}. ${a.mayNotice ? 'May notice' : 'Safe'}`}
                      style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}
                    >
                      {ticked ? (
                        <CheckCircleIcon size={20} weight="fill" color={colors.safe} />
                      ) : (
                        <CircleIcon size={20} color={colors.checkOff} />
                      )}
                      <Text style={[type.bodyInk, { flex: 1 }]}>{a.text}</Text>
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
