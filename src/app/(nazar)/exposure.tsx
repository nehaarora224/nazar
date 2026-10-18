import { router } from 'expo-router';
import { ChatCircleIcon, DeviceMobileIcon, FootprintsIcon, Icon, ImageIcon, MapPinIcon, ShieldCheckIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Chips, Empty, InfoBox, ListCard, ListRow, MainHeader, PageTitle, SampleBanner, StatusLine } from '../../components/ui';
import { TKey, useT } from '../../i18n';
import { useStore } from '../../store';
import { tone, type } from '../../theme';
import { exposureOverview, ExposureKey, findings, useView } from '../../view';

const ICON: Record<ExposureKey, Icon> = { movement: FootprintsIcon, location: MapPinIcon, messages: ChatCircleIcon, photos: ImageIcon, device: DeviceMobileIcon };

/** What can they see? Categories and findings from real checks and labelled samples. */
export default function ExposureScreen() {
  const { data } = useStore();
  const v = useView();
  const { t, tn, when } = useT();
  const [cat, setCat] = useState<'all' | ExposureKey>('all');
  const list = findings(data, v);
  const overview = exposureOverview(data, v, list);
  const shown = list.filter((f) => cat === 'all' || f.category === cat);

  return (
    <Screen header={<MainHeader />}>
      <PageTitle kicker={t('exp.label')} title={t('exp.heading')} sub={t('exp.sub')} />
      <SampleBanner />

      <View style={styles.strip}>
        {overview.map((o) => {
          const I = ICON[o.key];
          const c = tone[o.tone];
          return (
            <View key={o.key} style={[styles.chip, { backgroundColor: c.bg }]} accessibilityLabel={`${t(`exp.${o.key}` as TKey)}: ${o.open ? tn('exp.open', o.open) : o.checked ? t('exp.clear') : t('exp.notChecked')}`}>
              <I size={19} weight="fill" color={c.dot} />
              <Text style={[type.pill, { color: c.fg, textAlign: 'center' }]} numberOfLines={2}>
                {t(`exp.${o.key}` as TKey)}
              </Text>
              <Text style={[styles.chipState, { color: c.fg }]} numberOfLines={1}>
                {o.open ? tn('exp.open', o.open) : o.checked ? t('exp.clear') : t('exp.notChecked')}
              </Text>
            </View>
          );
        })}
      </View>

      <Chips<'all' | ExposureKey>
        value={cat}
        onChange={setCat}
        items={[{ key: 'all', label: t('vault.f.all') }, ...overview.map((o) => ({ key: o.key, label: t(`exp.${o.key}` as TKey) }))]}
      />

      <ListCard title={t('exp.findings')} count={shown.length}>
        {shown.length === 0 ? (
          <Empty icon={ShieldCheckIcon} title={t('exp.findingsEmpty')} body={t('exp.findingsEmptyBody')} />
        ) : (
          shown.map((f, i) => (
            <ListRow
              key={f.id}
              first={i === 0}
              icon={ICON[f.category]}
              iconBg={tone[f.saved ? 'safe' : f.tone].bg}
              iconFg={tone[f.saved ? 'safe' : f.tone].fg}
              title={f.titleKey ? (f.title ? `${t(f.titleKey)} · ${f.title}` : t(f.titleKey)) : f.title}
              status={<StatusLine t={f.saved ? 'safe' : f.tone} label={f.saved ? t('exp.status.saved') : t('exp.status.review')} sample={f.sample} />}
              desc={`${t(`exp.${f.category}` as TKey)} · ${t(f.lineKey)}`}
              meta={when(f.at)}
              onPress={() => router.navigate({ pathname: f.href as '/accounts', params: f.params })}
            />
          ))
        )}
      </ListCard>
      <InfoBox body={t('exp.caveat')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexBasis: '31%', flexGrow: 1, alignItems: 'center', gap: 4, paddingTop: 10, paddingBottom: 9, paddingHorizontal: 4, borderRadius: 14 },
  chipState: { fontSize: 13, fontWeight: '500' },
});
