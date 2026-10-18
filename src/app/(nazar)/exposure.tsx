import { Href, router } from 'expo-router';
import { CaretRightIcon, ChatCircleIcon, FootprintsIcon, Icon, ImageIcon, MapPinIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { card, IconChip, MainHeader, Pill } from '../../components/ui';
import { exposure, ExposureKey } from '../../derive';
import { TKey, useT } from '../../i18n';
import { useStore } from '../../store';
import { colors, space, tone, type } from '../../theme';

const ICON: Record<ExposureKey, Icon> = { movement: FootprintsIcon, location: MapPinIcon, messages: ChatCircleIcon, photos: ImageIcon };
const HREF: Record<ExposureKey, Href> = { movement: '/tracker', location: '/quiet-check', messages: '/accounts', photos: '/accounts' };

/** What can they see? Derived only from checks she has done; unchecked areas say so. */
export default function ExposureScreen() {
  const { data } = useStore();
  const { t } = useT();
  const items = exposure(data);

  return (
    <Screen header={<MainHeader />} gap={14}>
      <View style={{ gap: 6 }}>
        <Text style={type.display} accessibilityRole="header">
          {t('exp.heading')}
        </Text>
        <Text style={type.body}>{t('exp.sub')}</Text>
      </View>

      <View style={styles.strip}>
        {items.map(({ key, t: tn }) => {
          const I = ICON[key];
          return (
            <View key={key} style={[styles.chip, { backgroundColor: tone[tn].bg }]}>
              <I size={19} weight="fill" color={tone[tn].dot} />
              <Text style={[type.pill, { color: tone[tn].fg, textAlign: 'center' }]} numberOfLines={2}>
                {t(`exp.${key}` as TKey)}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={type.overline}>{t('exp.order')}</Text>
      {items.map(({ key, t: tn, state }) => {
        const line = t(`exp.${key}.${state}` as TKey);
        return (
          <Pressable
            key={key}
            onPress={() => router.navigate(HREF[key])}
            accessibilityRole="button"
            accessibilityLabel={`${t(`exp.${key}` as TKey)}. ${line}`}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.lavenderSoft }]}
          >
            <IconChip icon={ICON[key]} size={44} radius={14} iconSize={21} bg={tone[tn].bg} fg={tone[tn].fg} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={type.label}>{t(`exp.${key}` as TKey)}</Text>
              <Text style={type.body}>{line}</Text>
              {tn !== 'off' && tn !== 'safe' && <Pill t={tn} label={t('acct.status.review')} style={{ alignSelf: 'flex-start' }} />}
            </View>
            <CaretRightIcon size={16} weight="bold" color={colors.muted} />
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, alignItems: 'center', gap: 5, paddingTop: 10, paddingBottom: 9, paddingHorizontal: 2, borderRadius: 14 },
  row: { ...card, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: space.lg },
});
