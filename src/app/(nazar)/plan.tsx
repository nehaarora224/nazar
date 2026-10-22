import { router } from 'expo-router';
import {
  ArchiveIcon,
  ArrowSquareOutIcon,
  BluetoothIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckCircleIcon,
  CircleIcon,
  DeviceMobileIcon,
  DotsThreeIcon,
  FootprintsIcon,
  HandHeartIcon,
  HeartIcon,
  Icon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  NotePencilIcon,
  PathIcon,
  UserCircleIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SheetHead, useOverlay } from '../../components/Overlay';
import { Screen } from '../../components/Screen';
import { card, Choice, InfoBox, MainHeader, NoticePill, PageTitle, PrimaryButton, SecondaryButton } from '../../components/ui';
import { TKey, useT } from '../../i18n';
import { orderedPlan, planSummary, planTaskDef, planTaskKey, PlanTask, PlanTaskStatus, reasonKey } from '../../plan';
import { useStore } from '../../store';
import { colors, fonts, tone, Tone, type } from '../../theme';

const TASK_ICON: Record<string, Icon> = {
  preserve: ArchiveIcon,
  support: HandHeartIcon,
  uncertain_start: MagnifyingGlassIcon,
  accounts_review: UserCircleIcon,
  location_review: MapPinIcon,
  tracker_scan: BluetoothIcon,
  device_settings: DeviceMobileIcon,
  footprint_audit: FootprintsIcon,
  secure_changes: LockSimpleIcon,
};

const STATUS_META: Record<PlanTaskStatus, { tone: Tone; key: TKey }> = {
  todo: { tone: 'off', key: 'plan.st.todo' },
  done: { tone: 'safe', key: 'plan.st.done' },
  skipped: { tone: 'off', key: 'plan.st.skipped' },
  postponed: { tone: 'look', key: 'plan.st.postponed' },
  dismissed: { tone: 'off', key: 'plan.st.dismissed' },
};
const STATUS_ORDER: PlanTaskStatus[] = ['todo', 'done', 'skipped', 'postponed', 'dismissed'];

/** Screen 07 — Adaptive Safe Plan. Built from the person's own situation by transparent rules. */
export default function Plan() {
  const { data } = useStore();
  const { t } = useT();
  const situation = data.situation;

  return (
    <Screen gap={14} header={<MainHeader />}>
      <PageTitle kicker={t('plan.label')} title={t('plan.heading')} />
      {situation ? <PlanBody /> : <FirstUse />}
    </Screen>
  );
}

/** First use: no situation yet. Gentle, never implying an assessment has confirmed anything. */
function FirstUse() {
  const { t } = useT();
  return (
    <>
      <Reassure />
      <View style={[card, styles.pad]}>
        <View style={{ gap: 8 }}>
          <Text style={type.title}>{t('plan.firstTitle')}</Text>
          <Text style={[type.body, { lineHeight: 22 }]}>{t('plan.firstBody')}</Text>
        </View>
      </View>
      <InfoBox body={t('plan.firstSafe')} />
      <PrimaryButton icon={NotePencilIcon} label={t('plan.describe')} onPress={() => router.navigate('/plan-situation')} />
    </>
  );
}

function PlanBody() {
  const { data, setPlanTaskStatus } = useStore();
  const { t } = useT();
  const { openSheet, closeSheet } = useOverlay();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const tasks = orderedPlan(data.planTasks).filter((x) => x.status !== 'dismissed');
  const s = planSummary(data.planTasks);
  const next = tasks.find((x) => x.status === 'todo' || x.status === 'postponed');

  const changeStatus = (task: PlanTask) =>
    openSheet(
      <>
        <SheetHead title={t('plan.changeStatus')} body={t(planTaskKey(task.id, 'title'))} />
        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          {STATUS_ORDER.map((st) => (
            <Choice
              key={st}
              t={STATUS_META[st].tone}
              label={t(STATUS_META[st].key)}
              selected={task.status === st}
              onPress={() => {
                setPlanTaskStatus(task.id, st);
                closeSheet();
              }}
            />
          ))}
        </View>
      </>,
    );

  return (
    <>
      {/* Progress */}
      <View style={[card, styles.pad, { gap: 10 }]}>
        <Text style={type.label}>{t('plan.progress', { done: s.done, total: s.total })}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${s.total ? (s.done / s.total) * 100 : 0}%` }]} />
        </View>
        {next ? (
          <View style={styles.next}>
            <PathIcon size={18} color={colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.overline}>{t('plan.nextUp')}</Text>
              <Text style={type.bodyInk}>{t(planTaskKey(next.id, 'title'))}</Text>
            </View>
            <NoticePill mayNotice={planTaskDef(next.id)?.mayNotice} />
          </View>
        ) : (
          <Text style={type.body}>{t('plan.allDone')}</Text>
        )}
      </View>

      <Reassure />
      <SecondaryButton icon={NotePencilIcon} label={t('plan.update')} onPress={() => router.navigate('/plan-situation')} />

      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} expanded={!!open[task.id]} onToggle={() => setOpen((o) => ({ ...o, [task.id]: !o[task.id] }))} onStatus={() => changeStatus(task)} />
      ))}

      {s.dismissed > 0 && <Text style={[type.body, { fontSize: 13, textAlign: 'center' }]}>{t('plan.dismissedNote', { n: s.dismissed })}</Text>}
      <InfoBox body={t('plan.notDiagnosis')} />
    </>
  );
}

function TaskCard({ task, expanded, onToggle, onStatus }: { task: PlanTask; expanded: boolean; onToggle: () => void; onStatus: () => void }) {
  const { setPlanTaskStatus } = useStore();
  const { t } = useT();
  const def = planTaskDef(task.id);
  const TIcon = TASK_ICON[task.id] ?? CircleIcon;
  const sm = STATUS_META[task.status];
  const done = task.status === 'done';

  return (
    <View style={[card, styles.task]}>
      <Pressable onPress={onToggle} accessibilityRole="button" style={styles.taskHead}>
        <View style={[styles.chip, { backgroundColor: colors.lavenderSoft }]}>
          <TIcon size={19} color={colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={styles.taskTitle}>{t(planTaskKey(task.id, 'title'))}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: tone[sm.tone].dot }]} />
            <Text style={[type.pill, { color: colors.muted }]}>{t(sm.key)}</Text>
            <NoticePill mayNotice={def?.mayNotice} />
          </View>
          <Text style={[type.body, { fontSize: 13 }]}>{t('plan.reasonLine', { reason: t(reasonKey(task.reason)) })}</Text>
        </View>
        {expanded ? <CaretDownIcon size={16} color={colors.primary} weight="bold" /> : <CaretRightIcon size={16} color={colors.primary} weight="bold" />}
      </Pressable>

      {expanded && (
        <View style={{ gap: 12, marginTop: 4 }}>
          <Detail title={t('plan.sectionWhy')} body={t(planTaskKey(task.id, 'why'))} />
          <Detail title={t('plan.sectionSteps')} body={t(planTaskKey(task.id, 'steps'))} />
          <Detail title={t('plan.sectionObs')} body={t(planTaskKey(task.id, 'obs'))} />
          <Detail title={t('plan.sectionLimits')} body={t(planTaskKey(task.id, 'limits'))} />
          <Detail title={t('plan.sectionAlt')} body={t(planTaskKey(task.id, 'alt'))} />
          {def?.href && (
            <SecondaryButton icon={ArrowSquareOutIcon} label={t('plan.openFeature')} onPress={() => router.navigate(def.href as '/exposure')} />
          )}
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={() => setPlanTaskStatus(task.id, done ? 'todo' : 'done')}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={t(planTaskKey(task.id, 'title'))}
          hitSlop={6}
          style={({ pressed }) => [styles.doneBtn, done && styles.doneBtnOn, pressed && { opacity: 0.85 }]}
        >
          {done ? <CheckCircleIcon size={20} weight="fill" color={colors.safe} /> : <CircleIcon size={20} color={colors.checkOff} />}
          <Text style={[type.pill, { color: done ? colors.safeFg : colors.primaryDeep }]}>{done ? t('plan.markTodo') : t('plan.markDone')}</Text>
        </Pressable>
        <Pressable onPress={onStatus} accessibilityRole="button" accessibilityLabel={t('plan.changeStatus')} hitSlop={6} style={styles.moreBtn}>
          <DotsThreeIcon size={18} weight="bold" color={colors.primary} />
          <Text style={[type.pill, { color: colors.primary }]}>{t('plan.more')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Detail({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={type.overline}>{title}</Text>
      <Text style={[type.bodyInk, { lineHeight: 22 }]}>{body}</Text>
    </View>
  );
}

function Reassure() {
  const { t } = useT();
  return (
    <View style={styles.banner}>
      <HeartIcon size={20} weight="fill" color={colors.tealDeep} />
      <Text style={styles.bannerText}>
        <Text style={{ fontFamily: fonts.semibold }}>{t('plan.bannerBold')}</Text> {t('plan.bannerRest')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.lavender, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  next: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.statTile },
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
  task: { padding: 14, gap: 10 },
  taskHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  chip: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 21, color: colors.ink },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(31,28,46,0.07)', paddingTop: 10 },
  doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.lavenderSoft },
  doneBtnOn: { backgroundColor: colors.safeBg },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 999, marginLeft: 'auto' },
});
