import { router } from 'expo-router';
import { FileLockIcon, PlusIcon } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { BAIT_ICON } from '../../content/baits';
import { Card, IconChip, InfoBox, Pill, PrimaryButton, SecondaryButton, SectionTitle, Stats, SubHeader } from '../../components/ui';
import { useT } from '../../i18n';
import { baitSummary, Bait, countedEvents, useStore } from '../../store';
import { colors, radius, space, type } from '../../theme';

/** Bait Test management: the real state of every bait and the opens it actually recorded. */
export default function BaitTest() {
  const { data, status } = useStore();
  const { t, when } = useT();
  const s = baitSummary(data);
  const unknown = status !== 'ready';

  return (
    <Screen header={<SubHeader title={t('bait.title')} />}>
      <Text style={type.display} accessibilityRole="header">
        {t('bait.title')}
      </Text>
      <Text style={type.body}>{t('bait.intro')}</Text>

      <Stats
        items={[
          { label: t('baitW.statActive'), value: unknown ? '—' : s.active.length },
          { label: t('baitW.statToday'), value: unknown ? '—' : s.today.length, t: s.today.length ? 'act' : undefined },
          { label: t('baitW.statLatest'), value: unknown ? '—' : s.latest ? when(s.latest.at) : t('common.none') },
        ]}
      />

      <SectionTitle>{t('bait.list')}</SectionTitle>
      {data.baits.length === 0 ? (
        <View style={styles.empty}>
          <IconChip icon={FileLockIcon} size={48} radius={16} iconSize={24} bg={colors.lavender} />
          <Text style={type.title}>{t('bait.empty.title')}</Text>
          <Text style={[type.body, { textAlign: 'center' }]}>{t('bait.empty.body')}</Text>
          <PrimaryButton icon={PlusIcon} label={t('baitW.setFirst').replace('+ ', '')} onPress={() => router.navigate('/bait-new')} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        <>
          {data.baits.map((b) => (
            <BaitCard key={b.id} bait={b} />
          ))}
          <SecondaryButton icon={PlusIcon} label={t('baitW.setAnother').replace('+ ', '')} onPress={() => router.navigate('/bait-new')} />
        </>
      )}

      <InfoBox title={t('bait.limits.title')} body={t('bait.limits.body')} />
    </Screen>
  );
}

function BaitCard({ bait }: { bait: Bait }) {
  const { data } = useStore();
  const { t, when } = useT();
  const events = countedEvents(data.baitEvents.filter((e) => e.baitId === bait.id));
  const latest = events.reduce<number | undefined>((m, e) => (m === undefined || e.at > m ? e.at : m), undefined);
  return (
    <Card
      onPress={() => router.navigate({ pathname: '/bait-detail', params: { id: bait.id } })}
      label={`${bait.name}. ${t(`bait.type.${bait.type}`)}. ${bait.active ? t('bait.status.active') : t('bait.status.inactive')}`}
    >
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <IconChip icon={BAIT_ICON[bait.type]} size={42} radius={14} iconSize={20} bg={bait.active ? colors.lavender : colors.offIconBg} fg={bait.active ? colors.primary : colors.muted} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={type.label}>{bait.name}</Text>
          <Text style={[type.body, { fontSize: 14 }]}>{t(`bait.type.${bait.type}`)}</Text>
          <Text style={[type.body, { fontSize: 13 }]}>{t('bait.created', { when: when(bait.createdAt) })}</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
            <Pill t={bait.active ? 'safe' : 'off'} label={bait.active ? t('bait.status.active') : t('bait.status.inactive')} />
            <Text style={[type.pill, { color: latest ? colors.actFg : colors.muted }]}>
              {latest ? t('bait.latest', { when: when(latest) }) : t('bait.latestNone')}
            </Text>
          </View>
          <Text style={[type.pill, { color: colors.primary, marginTop: 4 }]}>{t('bait.inspect')}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: space.sm, padding: space.xl, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
});
