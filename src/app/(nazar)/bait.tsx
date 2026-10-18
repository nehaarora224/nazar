import { router } from 'expo-router';
import {
  AddressBookIcon,
  BankIcon,
  ChatCircleDotsIcon,
  EyeIcon,
  FishSimpleIcon,
  Icon,
  ImagesIcon,
  LockKeyIcon,
  NoteIcon,
  PlusIcon,
  ShieldCheckIcon,
  TimerIcon,
} from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { IconChip, NoticePill, SecondaryButton, StatusText } from '../../components/ui';
import { colors, fonts, shadow, Tone, type } from '../../theme';

type Bait = { name: string; desc: string; icon: Icon; status: string; t: Tone; mayNotice?: boolean };

const BAITS: Bait[] = [
  { name: 'Fake “Passwords” note', desc: 'Looks like your saved logins', icon: NoteIcon, status: 'Caught 1', t: 'act' },
  { name: 'Decoy photo album “Private”', desc: 'Opens to harmless photos', icon: ImagesIcon, status: 'Watching', t: 'safe' },
  { name: 'Decoy chat “Didi ❤”', desc: 'A fake conversation in a hidden folder', icon: ChatCircleDotsIcon, status: 'Watching', t: 'safe' },
  { name: 'Fake banking app icon', desc: 'Logs any tap on it', icon: BankIcon, status: 'Watching', t: 'safe', mayNotice: true },
  { name: 'Fake contact “Lawyer — Adv. Rao”', desc: "Notes if it's viewed or deleted", icon: AddressBookIcon, status: 'Off', t: 'off' },
];

/** Screen 05 — Someone took the bait. Decoys that look tempting to a snooper, and record who opens them. */
export default function BaitScreen() {
  return (
    <Screen
      gap={9}
      padTop={2}
      header={
        <>
          <IconChip icon={FishSimpleIcon} size={40} radius={14} iconSize={20} bg={colors.lavender} />
          <Text style={styles.title}>Bait</Text>
        </>
      }
    >
      <Pressable
        onPress={() => router.navigate('/vault')}
        accessibilityRole="button"
        accessibilityLabel="Someone opened a bait today. Open in Vault."
        style={({ pressed }) => [styles.alert, pressed && { opacity: 0.9 }]}
      >
        <View style={styles.alertHead}>
          <View style={styles.alertIcon}>
            <EyeIcon size={19} weight="bold" color={colors.surface} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.title}>Someone opened a bait today</Text>
            <Text style={type.body}>Saturday, 11:42 PM · while you were away</Text>
          </View>
        </View>

        <View style={styles.evidence}>
          <View style={styles.photo}>
            <View style={styles.photoFace} />
            <View style={styles.photoBody} />
            <Text style={styles.photoLabel}>Photo taken</Text>
          </View>
          <View style={styles.facts}>
            <Fact icon={LockKeyIcon} text="Unlock attempt · wrong PIN ×2" />
            <Fact icon={TimerIcon} text="Opened for 38 seconds" />
          </View>
        </View>

        <View style={styles.saved}>
          <ShieldCheckIcon size={18} weight="fill" color={colors.primary} />
          <Text style={[type.bodyInk, { flex: 1 }]}>Saved to your Vault. He wasn't shown anything real.</Text>
        </View>
      </Pressable>

      <Text style={type.label}>Your baits</Text>
      <View style={styles.list}>
        {BAITS.map((b, i) => (
          <View key={b.name} style={[styles.row, i > 0 && styles.rowBorder]}>
            <IconChip
              icon={b.icon}
              size={36}
              iconSize={18}
              bg={b.t === 'off' ? colors.offIconBg : colors.lavenderSoft}
              fg={b.t === 'off' ? colors.muted : colors.primary}
            />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <View style={styles.line}>
                <Text style={[type.label, { fontSize: 15, flexShrink: 1 }]}>{b.name}</Text>
                <NoticePill mayNotice={b.mayNotice} />
              </View>
              <View style={styles.line}>
                <Text style={[type.body, { flexShrink: 1, lineHeight: 19 }]}>{b.desc}</Text>
                <StatusText t={b.t} label={b.status} />
              </View>
            </View>
          </View>
        ))}
      </View>

      <SecondaryButton label="Plant a new bait" icon={PlusIcon} />
    </Screen>
  );
}

function Fact({ icon: I, text }: { icon: Icon; text: string }) {
  return (
    <View style={styles.fact}>
      <I size={17} color={colors.actFg} style={{ marginTop: 1 }} />
      <Text style={[type.bodyInk, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.medium, fontSize: 20, letterSpacing: -0.2, color: colors.ink },
  alert: {
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundImage: 'linear-gradient(160deg, #F6E3DF 0%, #FBF2EF 100%)',
    boxShadow: '0px 12px 26px -20px rgba(138,63,53,0.5)',
  },
  alertHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  alertIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.act, alignItems: 'center', justifyContent: 'center' },
  evidence: { flexDirection: 'row', gap: 12 },
  photo: {
    width: 82,
    height: 66,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundImage: 'linear-gradient(160deg, #8C7F86 0%, #5D5560 100%)',
  },
  photoFace: { position: 'absolute', left: 16, top: 10, width: 50, height: 50, borderRadius: 25, backgroundColor: '#B9A496', filter: 'blur(9px)' },
  photoBody: {
    position: 'absolute',
    left: 4,
    top: 52,
    width: 74,
    height: 50,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    backgroundColor: '#3F3A45',
    filter: 'blur(8px)',
  },
  photoLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 4,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.onPrimary,
    backgroundColor: 'rgba(31,28,46,0.55)',
  },
  facts: { flex: 1, justifyContent: 'center', gap: 8 },
  fact: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  saved: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,253,249,0.75)',
  },
  list: { borderRadius: 20, backgroundColor: colors.surface, boxShadow: shadow.soft, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.hairline },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
});
