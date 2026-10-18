import { BluetoothIcon, CrosshairSimpleIcon, FootprintsIcon, InfoIcon, SpeakerHighIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';

import { Screen } from '../../components/Screen';
import { BackButton, card, IconChip, NoticePill } from '../../components/ui';
import { colors, fonts, type } from '../../theme';

const SIGNAL_LABELS = ['', 'Far · keep walking', 'Warmer · ~6 m', 'Close · ~2 m', 'Very close · ~1 m', 'Right here'];
const BAR_HEIGHTS = [14, 21, 28, 34, 40];

/** Map stops, in the map's 364×222 coordinate space. Labels stay generic — never "Home" or "Office". */
const STOPS = [
  { n: 1, x: 62, y: 46 },
  { n: 2, x: 130, y: 124 },
  { n: 3, x: 246, y: 92 },
];

/** Screen 04 — Tracker following you. */
export default function Tracker() {
  const [closer, setCloser] = useState(1);

  return (
    <Screen
      header={
        <>
          <BackButton />
          <View style={styles.headerPill}>
            <BluetoothIcon size={14} weight="fill" color={colors.lookFg} />
            <Text style={[type.pill, { color: colors.lookFg }]}>Unknown tracker</Text>
          </View>
        </>
      }
    >
      <TrackerMap />

      <View style={[card, styles.alert]}>
        <IconChip icon={FootprintsIcon} size={42} radius={14} iconSize={21} bg={colors.lookBg} fg={colors.lookIcon} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={type.title}>This tracker followed you to 4 places today.</Text>
          <Text style={type.body}>It isn't yours. Take a breath — you can find it.</Text>
        </View>
      </View>

      <View style={styles.meter}>
        <View style={styles.meterTop}>
          <View style={{ gap: 2 }}>
            <Text style={type.body}>Signal strength</Text>
            <Text style={styles.signalLabel}>{SIGNAL_LABELS[closer]}</Text>
          </View>
          <View style={styles.bars} accessibilityLabel={`Signal ${closer} of 5`}>
            {BAR_HEIGHTS.map((h, i) => (
              <View
                key={h}
                style={[
                  styles.bar,
                  { height: h, backgroundColor: i < closer ? (i >= 3 ? colors.tealDeep : colors.primary) : 'rgba(75,63,160,0.16)' },
                ]}
              />
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => setCloser((c) => (c >= 5 ? 1 : c + 1))}
          accessibilityRole="button"
          accessibilityLabel="Find it. Safe, he won't notice."
          style={({ pressed }) => [styles.action, styles.find, pressed && { backgroundColor: colors.primaryDeep }]}
        >
          <View style={styles.actionLeft}>
            <CrosshairSimpleIcon size={19} color={colors.onPrimary} />
            <Text style={[styles.actionText, { color: colors.onPrimary }]}>Find it</Text>
          </View>
          <NoticePill />
        </Pressable>

        <View style={{ gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play sound. May notice."
            style={({ pressed }) => [styles.action, styles.sound, pressed && { backgroundColor: '#F4F1FB' }]}
          >
            <View style={styles.actionLeft}>
              <SpeakerHighIcon size={19} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Play sound</Text>
            </View>
            <NoticePill mayNotice />
          </Pressable>
          <View style={styles.note}>
            <InfoIcon size={16} color={colors.muted} />
            <Text style={type.body}>A sound may alert someone nearby</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

function TrackerMap() {
  return (
    <View style={styles.map}>
      <Svg viewBox="0 0 364 222" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Path d="M-10 168 C70 146 110 196 190 176 C260 160 300 196 380 182 L380 240 L-10 240 Z" fill="#DCE8EC" />
        <Ellipse cx={290} cy={52} rx={62} ry={34} fill="#DDE8D6" />
        <Ellipse cx={54} cy={96} rx={38} ry={24} fill="#DDE8D6" />
        <G stroke="#FBFAF6" strokeLinecap="round" fill="none">
          <Path d="M-10 58 L380 36" strokeWidth={10} />
          <Path d="M-10 128 C100 120 220 138 380 114" strokeWidth={12} />
          <Path d="M108 -10 L140 240" strokeWidth={9} />
          <Path d="M240 -10 C228 80 256 150 236 240" strokeWidth={8} />
          <Path d="M24 200 L170 -10" strokeWidth={5} />
          <Path d="M180 88 L380 88" strokeWidth={5} />
          <Path d="M48 20 L70 240" strokeWidth={4} />
          <Path d="M318 -10 L328 240" strokeWidth={4} />
        </G>
        <Path
          d="M62 46 C92 70 106 108 130 124 C164 148 210 100 246 92 C276 86 296 124 300 152"
          fill="none"
          stroke={colors.primary}
          strokeWidth={2.6}
          strokeDasharray="2 7"
          strokeLinecap="round"
          opacity={0.85}
        />
      </Svg>
      {/* Pins are positioned as a fraction of the map so they stay on the path at any width. */}
      {STOPS.map((s) => (
        <View key={s.n} style={[styles.pin, { left: `${(s.x / 364) * 100}%`, top: `${(s.y / 222) * 100}%` }]}>
          <Text style={styles.pinText}>{s.n}</Text>
        </View>
      ))}
      <View style={[styles.lastHalo, { left: `${(300 / 364) * 100}%`, top: `${(152 / 222) * 100}%` }]} />
      <View style={[styles.lastPin, { left: `${(300 / 364) * 100}%`, top: `${(152 / 222) * 100}%` }]}>
        <Text style={[styles.pinText, { color: colors.onPrimary, fontSize: 14 }]}>4</Text>
      </View>
      <View style={styles.mapLabels}>
        <Text style={styles.mapLabel}>Stop 1 · 8:10</Text>
        <Text style={styles.mapLabel}>Stop 2 · 10:30</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.lookBg,
  },
  map: {
    height: 222,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#ECEEE6',
    borderWidth: 1,
    borderColor: 'rgba(46,38,112,0.06)',
  },
  pin: {
    position: 'absolute',
    width: 28,
    height: 28,
    marginLeft: -14,
    marginTop: -14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 10px -3px rgba(46,38,112,0.4)',
  },
  lastHalo: {
    position: 'absolute',
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -30,
    borderRadius: 30,
    backgroundColor: 'rgba(75,63,160,0.14)',
  },
  lastPin: {
    position: 'absolute',
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 6px 14px -4px rgba(75,63,160,0.7), 0px 0px 0px 3px ${colors.surface}`,
  },
  pinText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  mapLabels: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', gap: 6 },
  mapLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,253,249,0.94)',
    overflow: 'hidden',
  },
  alert: { flexDirection: 'row', gap: 14, padding: 16, boxShadow: '0px 12px 26px -18px rgba(46,38,112,0.4)' },
  meter: {
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundImage: 'linear-gradient(135deg, #ECE8F7 0%, #E6F0EE 100%)',
  },
  meterTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  signalLabel: { fontFamily: fonts.medium, fontSize: 19, color: colors.primaryDeep },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 40 },
  bar: { width: 10, borderRadius: 4 },
  action: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 12,
  },
  find: { backgroundColor: colors.primary },
  sound: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: 'rgba(75,63,160,0.35)' },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  actionText: { fontFamily: fonts.medium, fontSize: 16 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
});
