import {
  CloudSlashIcon,
  DeviceMobileIcon,
  FilePdfIcon,
  FishSimpleIcon,
  Icon,
  ImageSquareIcon,
  LockSimpleIcon,
  PaperPlaneTiltIcon,
  PathIcon,
  SealCheckIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { IconChip, PrimaryButton } from '../../components/ui';
import { colors, fonts, shadow, type } from '../../theme';

type Kind = 'bait' | 'tracker' | 'signin' | 'shot';
type Item = { day: 'Today' | 'Yesterday'; kind: Kind; icon: Icon; title: string; meta: string };

const FILTERS: { label: string; kind?: Kind }[] = [
  { label: 'All' },
  { label: 'Bait catches', kind: 'bait' },
  { label: 'Trackers', kind: 'tracker' },
  { label: 'Sign-ins', kind: 'signin' },
  { label: 'Screenshots', kind: 'shot' },
];

const ITEMS: Item[] = [
  { day: 'Today', kind: 'bait', icon: FishSimpleIcon, title: 'Bait opened — Passwords note', meta: '11:42 PM · Photo attached' },
  { day: 'Today', kind: 'tracker', icon: PathIcon, title: 'Tracker path report — 4 stops', meta: '6:10 PM' },
  { day: 'Today', kind: 'signin', icon: UserCircleIcon, title: 'New sign-in on Google — Chrome, Noida', meta: '2:05 PM' },
  { day: 'Yesterday', kind: 'shot', icon: ImageSquareIcon, title: 'Screenshot — threatening message', meta: 'Yesterday 9:30 PM' },
];

/** Screen 06 — Evidence Vault. */
export default function Vault() {
  const [filter, setFilter] = useState(0);
  const kind = FILTERS[filter].kind;
  const items = ITEMS.filter((r) => !kind || r.kind === kind);
  const groups = (['Today', 'Yesterday'] as const)
    .map((day) => ({ day, rows: items.filter((r) => r.day === day) }))
    .filter((g) => g.rows.length);

  return (
    <Screen
      gap={8}
      padTop={0}
      background="linear-gradient(180deg, #EFECF7 0%, #F6F3EE 30%)"
      header={
        <>
          <IconChip icon={LockSimpleIcon} size={40} radius={14} weight="fill" bg={colors.primary} fg={colors.onPrimary} />
          <Text style={styles.title}>Vault</Text>
        </>
      }
    >
      <View style={styles.reassure}>
        <ShieldCheckIcon size={14} weight="fill" color={colors.safeFg} />
        <Text style={[type.pill, { color: colors.safeFg }]}>Encrypted · hidden from Gallery & Files</Text>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={styles.heading}>Your proof, kept safe.</Text>
        <Text style={type.body}>Everything Nazar has seen, timestamped and untouched.</Text>
      </View>

      <View style={styles.summary}>
        <Text style={type.label}>23 items · last added 11:42 PM</Text>
        <View style={{ gap: 2 }}>
          <Meta icon={DeviceMobileIcon} text="Stored only on this phone" />
          <Meta icon={CloudSlashIcon} text="Backup: off — your choice" />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersInner}>
        {FILTERS.map((f, i) => {
          const on = i === filter;
          return (
            <Pressable
              key={f.label}
              onPress={() => setFilter(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
            >
              <Text style={[type.pill, { color: on ? colors.onPrimary : colors.primaryDeep }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ gap: 8 }}>
        {groups.map((g) => (
          <View key={g.day} style={{ gap: 4 }}>
            <Text style={type.overline}>{g.day}</Text>
            <View style={styles.group}>
              {g.rows.map((r, i) => (
                <View key={r.title} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <IconChip icon={r.icon} size={32} iconSize={18} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={[type.label, { fontSize: 15, lineHeight: 20 }]}>{r.title}</Text>
                    <View style={styles.metaLine}>
                      <Text style={type.body}>{r.meta}</Text>
                      <View style={styles.verified}>
                        <SealCheckIcon size={14} weight="fill" color={colors.safe} />
                        <Text style={[type.pill, { color: colors.safeFg }]}>Verified</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: 4 }}>
        <PrimaryButton label="Export report" icon={FilePdfIcon} height={50} style={{ borderRadius: 18 }} />
        <Text style={[type.body, { textAlign: 'center' }]}>One PDF for police, a lawyer or a counsellor — dated and verified</Text>
        <Pressable accessibilityRole="link" style={styles.send}>
          <PaperPlaneTiltIcon size={16} color={colors.primary} />
          <Text style={styles.sendText}>Send to a trusted person</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Meta({ icon: I, text }: { icon: Icon; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <I size={17} color={colors.primary} />
      <Text style={type.body}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.medium, fontSize: 20, letterSpacing: -0.2, color: colors.ink },
  reassure: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: colors.safeBg,
  },
  heading: { fontFamily: fonts.medium, fontSize: 24, lineHeight: 28, letterSpacing: -0.48, color: colors.ink },
  summary: { gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.surface, boxShadow: shadow.soft },
  filters: { marginRight: -18, flexGrow: 0 },
  filtersInner: { gap: 6, paddingRight: 18 },
  chip: { height: 32, paddingHorizontal: 13, borderRadius: 999, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary },
  chipOff: { backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(75,63,160,0.18)' },
  group: { borderRadius: 18, backgroundColor: colors.surface, overflow: 'hidden', boxShadow: '0px 10px 24px -20px rgba(46,38,112,0.35)' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.hairline },
  metaLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  send: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  sendText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primary },
});
