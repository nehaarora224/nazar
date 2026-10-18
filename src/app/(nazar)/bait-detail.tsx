import { router, useLocalSearchParams } from 'expo-router';
import { LockSimpleIcon, PauseIcon, PlayIcon, TrashIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { BAIT_ICON } from '../../content/baits';
import { Card, card, ConfirmButton, IconChip, InfoBox, Pill, SecondaryButton, SectionTitle, SubHeader } from '../../components/ui';
import { useT } from '../../i18n';
import { BaitEvent, useStore } from '../../store';
import { colors, radius, space, type } from '../../theme';

/** One bait: its state, where it lives, and every open it actually recorded. */
export default function BaitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, setBaitActive, deleteBait } = useStore();
  const { t, when } = useT();
  const bait = data.baits.find((b) => b.id === id);

  if (!bait) {
    return (
      <Screen header={<SubHeader title={t('bait.title')} onBack={() => router.navigate('/bait')} />}>
        <Text style={type.body}>{t('bd.notFound')}</Text>
      </Screen>
    );
  }

  const events = data.baitEvents.filter((e) => e.baitId === bait.id).sort((a, b) => b.at - a.at);

  return (
    <Screen header={<SubHeader title={t('bait.title')} onBack={() => router.navigate('/bait')} />}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <IconChip icon={BAIT_ICON[bait.type]} size={48} radius={16} iconSize={22} bg={colors.lavender} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={type.display} accessibilityRole="header">
            {bait.name}
          </Text>
          <Pill t={bait.active ? 'safe' : 'off'} label={bait.active ? t('bait.status.active') : t('bait.status.inactive')} style={{ alignSelf: 'flex-start' }} />
        </View>
      </View>

      <Card>
        <View style={{ gap: space.md }}>
          <KV label={t('bd.type')} value={t(`bait.type.${bait.type}`)} />
          <KV label={t('bd.created')} value={when(bait.createdAt)} />
          <KV label={t('bd.where')} value={t(`bn.where.${bait.type}`)} />
        </View>
      </Card>

      <SectionTitle>{t('bd.events')}</SectionTitle>
      {events.length === 0 ? <Text style={type.body}>{t('bd.eventsEmpty')}</Text> : events.map((e) => <EventRow key={e.id} event={e} />)}

      <InfoBox title={t('bait.limits.title')} body={t('bait.limits.body')} />

      <SecondaryButton
        icon={bait.active ? PauseIcon : PlayIcon}
        label={bait.active ? t('bd.pause') : t('bd.resume')}
        onPress={() => setBaitActive(bait.id, !bait.active)}
      />
      <ConfirmButton
        icon={TrashIcon}
        label={t('bd.delete')}
        confirmLabel={t('bd.deleteConfirm')}
        onConfirm={() => {
          deleteBait(bait.id);
          router.navigate('/bait');
        }}
      />
    </Screen>
  );
}

function EventRow({ event }: { event: BaitEvent }) {
  const { data, setEventWasMe, saveEvidence } = useStore();
  const { t, when, dur } = useT();
  const bait = data.baits.find((b) => b.id === event.baitId)!;
  const saved = data.evidence.some((e) => e.kind === 'bait' && e.refId === event.id);

  return (
    <View style={[styles.event, event.wasMe && { opacity: 0.7 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[styles.dot, { backgroundColor: event.wasMe ? colors.off : colors.act }]} />
        <Text style={[type.label, { flex: 1 }]}>{when(event.at)}</Text>
      </View>
      <Text style={type.body}>{event.durationMs ? t('bd.openFor', { d: dur(event.durationMs) }) : t('bd.noDur')}</Text>
      {event.wasMe ? (
        <View style={styles.actions}>
          <Text style={[type.pill, { color: colors.muted, flex: 1 }]}>{t('bd.markedMe')}</Text>
          <Small label={t('bd.undo')} onPress={() => setEventWasMe(event.id, false)} />
        </View>
      ) : (
        <View style={styles.actions}>
          <Small label={t('bd.wasMe')} onPress={() => setEventWasMe(event.id, true)} />
          <Small
            icon
            label={saved ? t('common.savedToVault') : t('common.saveToVault')}
            disabled={saved}
            onPress={() =>
              saveEvidence({ kind: 'bait', refId: event.id, eventAt: event.at, baitName: bait.name, baitType: bait.type, durationMs: event.durationMs })
            }
          />
        </View>
      )}
    </View>
  );
}

function Small({ label, onPress, disabled, icon }: { label: string; onPress: () => void; disabled?: boolean; icon?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.small, pressed && { backgroundColor: colors.lavender }, disabled && { opacity: 0.55 }]}
    >
      {icon && <LockSimpleIcon size={15} color={colors.primary} />}
      <Text style={[type.pill, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={type.overline}>{label}</Text>
      <Text style={type.bodyInk}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  event: { ...card, padding: 14, gap: 6, borderRadius: radius.md, boxShadow: 'none' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  small: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(75,63,160,0.25)',
  },
});
