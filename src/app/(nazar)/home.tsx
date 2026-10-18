import { Href, router } from 'expo-router';
import { BluetoothIcon, Icon, MagnifyingGlassIcon, ShieldCheckIcon, SquaresFourIcon, UserCircleIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { NazarEye, Wordmark } from '../../components/Logo';
import { Screen } from '../../components/Screen';
import { card, Dot, IconChip, PrimaryButton } from '../../components/ui';
import { RING, Tile, TILES, useNazar } from '../../state';
import { colors, fonts, tone, Tone, type } from '../../theme';

const CIRCUMFERENCE = 578; // 2π × 92
const TILE_ICON: Record<Tile['key'], Icon> = {
  apps: SquaresFourIcon,
  accounts: UserCircleIcon,
  trackers: BluetoothIcon,
  background: ShieldCheckIcon,
};
const TILE_HREF: Record<Tile['key'], Href> = {
  apps: '/exposure',
  accounts: '/vault',
  trackers: '/tracker',
  background: '/bait',
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Screen 02 — Safety Dashboard. One glance, one ring, one button. */
export default function Home() {
  const { dashboard, cycleDashboard } = useNazar();
  const ring = RING[dashboard];
  const [scanPct, setScanPct] = useState<number | null>(null);
  const interval = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => () => clearInterval(interval.current), []);

  function startScan() {
    if (scanPct != null) return;
    const t0 = Date.now();
    setScanPct(0);
    clearInterval(interval.current);
    interval.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 2200);
      setScanPct(ring.pct * (1 - Math.pow(1 - p, 3)));
      if (p >= 1) {
        clearInterval(interval.current);
        setScanPct(null);
      }
    }, 30);
  }

  const scanning = scanPct != null;
  const shown = scanning ? scanPct : ring.pct;
  const view: { label: string; sub: string; t: Tone | 'scan' } = scanning
    ? { label: `${Math.round(shown * 100)}%`, sub: 'Checking quietly…', t: 'scan' }
    : ring;
  const pill =
    view.t === 'scan' ? { bg: colors.lavender, fg: colors.primaryDeep, dot: colors.primary } : { ...tone[view.t] };

  return (
    <Screen header={<Wordmark />} background="linear-gradient(180deg, #ECE8F7 0%, #F6F3EE 40%)">
      <View style={{ gap: 4 }}>
        <Text style={type.body}>{greeting()}</Text>
        <Text style={styles.heading}>Your phone feels calm today.</Text>
      </View>

      <View style={styles.ringBlock}>
        <Pressable
          onLongPress={cycleDashboard}
          accessibilityLabel={`Safety status: ${view.label}. ${view.sub}`}
          style={styles.ringWrap}
        >
          <View style={styles.ringGlow} />
          <Svg width={196} height={196} viewBox="0 0 210 210" style={styles.ringSvg}>
            <Defs>
              <LinearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.primary} />
                <Stop offset="1" stopColor={colors.teal} />
              </LinearGradient>
            </Defs>
            <Circle cx={105} cy={105} r={92} fill="none" stroke="rgba(75,63,160,0.10)" strokeWidth={13} />
            <Circle
              cx={105}
              cy={105}
              r={92}
              fill="none"
              stroke="url(#ringG)"
              strokeWidth={13}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - shown)}
            />
          </Svg>
          <View style={styles.ringCore}>
            <NazarEye size={30} />
            <Text style={styles.ringLabel}>{view.label}</Text>
          </View>
        </Pressable>
        <View style={[styles.ringPill, { backgroundColor: pill.bg }]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: pill.dot }} />
          <Text style={[styles.ringPillText, { color: pill.fg }]}>{view.sub}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {TILES[dashboard].map((t) => (
          <Pressable
            key={t.key}
            onPress={() => router.navigate(TILE_HREF[t.key])}
            accessibilityRole="button"
            accessibilityLabel={`${t.name}: ${t.status}`}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.tileTop}>
              <IconChip icon={TILE_ICON[t.key]} />
              <Dot t={t.t} size={10} halo />
            </View>
            <View style={{ gap: 2 }}>
              <Text style={type.label}>{t.name}</Text>
              <Text style={[type.body, { lineHeight: 19 }]}>{t.status}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <PrimaryButton
        label={scanning ? 'Checking…' : 'Check my phone'}
        icon={MagnifyingGlassIcon}
        onPress={startScan}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.medium, fontSize: 27, lineHeight: 31, letterSpacing: -0.54, color: colors.ink },
  ringBlock: { alignItems: 'center', gap: 10 },
  ringWrap: { width: 196, height: 196, alignItems: 'center', justifyContent: 'center' },
  ringGlow: {
    position: 'absolute',
    width: 250,
    height: 250,
    left: -27,
    top: -27,
    borderRadius: 125,
    backgroundImage: 'radial-gradient(circle, rgba(75,63,160,0.14) 0%, rgba(75,63,160,0) 68%)',
  },
  ringSvg: { position: 'absolute', top: 0, left: 0, transform: [{ rotate: '-90deg' }] },
  ringCore: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: colors.surface,
    boxShadow: '0px 14px 30px -14px rgba(46,38,112,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ringLabel: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.33, color: colors.ink },
  ringPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
  ringPillText: { fontFamily: fonts.medium, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    ...card,
    flexBasis: '47%',
    flexGrow: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 9,
    boxShadow: '0px 1px 0px rgba(46,38,112,0.04), 0px 10px 24px -16px rgba(46,38,112,0.30)',
  },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
