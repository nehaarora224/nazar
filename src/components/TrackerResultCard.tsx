import { router } from 'expo-router';
import { BluetoothIcon } from 'phosphor-react-native';
import { Text, View } from 'react-native';

import { TRACKER_TONE } from '../derive';
import { TKey, useT } from '../i18n';
import { TrackerEntry, useStore } from '../store';
import { colors, space, type } from '../theme';
import { Card, IconChip, Pill } from './ui';

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Summary card for one recorded tracker check, with a repeat count for the past week. */
export function TrackerResultCard({ entry }: { entry: TrackerEntry }) {
  const { data } = useStore();
  const { t, when } = useT();
  const repeats = data.trackerEntries.filter((e) => e.result === 'tracker' && entry.at - e.at < WEEK && e.at <= entry.at).length;
  return (
    <Card onPress={() => router.navigate({ pathname: '/tracker-detail', params: { id: entry.id } })} label={t(`trk.cls.${entry.result}` as TKey)}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <IconChip icon={BluetoothIcon} size={42} radius={14} iconSize={20} />
        <View style={{ flex: 1, gap: 4 }}>
          <Pill t={TRACKER_TONE[entry.result]} label={t(`trk.cls.${entry.result}` as TKey)} style={{ alignSelf: 'flex-start' }} />
          <Text style={[type.body, { fontSize: 13 }]}>{`${t('common.recordedByYou')} · ${when(entry.at)}`}</Text>
          {entry.result === 'tracker' && repeats > 1 && <Text style={[type.pill, { color: colors.actFg }]}>{t('trk.repeat', { n: repeats })}</Text>}
        </View>
      </View>
    </Card>
  );
}

