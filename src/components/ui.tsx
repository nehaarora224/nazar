import { router } from 'expo-router';
import { ArrowLeftIcon, Icon, PhoneIcon, SignOutIcon, SirenIcon } from 'phosphor-react-native';
import { ReactNode } from 'react';
import { Linking, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, fonts, gradients, shadow, tone, Tone, type } from '../theme';

/** Instantly back to the calculator. Present on every unlocked screen. */
export function quickExit() {
  router.dismissTo('/');
}

export function QuickExitButton() {
  return (
    <Pressable
      onPress={quickExit}
      accessibilityRole="button"
      accessibilityLabel="Quick exit"
      style={({ pressed }) => [styles.quickExit, pressed && { backgroundColor: colors.lavenderPillPressed }]}
    >
      <SignOutIcon size={17} weight="bold" color={colors.primaryDeep} />
      <Text style={styles.quickExitText}>Quick exit</Text>
    </Pressable>
  );
}

export function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.navigate('/home')))}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={6}
      style={({ pressed }) => [styles.back, pressed && { backgroundColor: colors.lavender }]}
    >
      <ArrowLeftIcon size={18} color={colors.ink} />
    </Pressable>
  );
}

/** The 52px app bar: left content + Quick exit. */
export function AppBar({ children }: { children: ReactNode }) {
  return (
    <View style={styles.appBar}>
      <View style={styles.appBarLeft}>{children}</View>
      <QuickExitButton />
    </View>
  );
}

/** Rounded square icon holder used in headers, lists and tiles. */
export function IconChip({
  icon: I,
  size = 34,
  radius = 12,
  iconSize = 19,
  bg = colors.lavenderSoft,
  fg = colors.primary,
  weight = 'regular',
}: {
  icon: Icon;
  size?: number;
  radius?: number;
  iconSize?: number;
  bg?: string;
  fg?: string;
  weight?: 'regular' | 'fill' | 'bold';
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <I size={iconSize} color={fg} weight={weight} />
    </View>
  );
}

export function Dot({ t, size = 8, halo = false }: { t: Tone; size?: number; halo?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tone[t].dot,
        boxShadow: halo ? `0px 0px 0px 4px ${tone[t].halo}` : undefined,
      }}
    />
  );
}

/** Tinted pill with a status dot. */
export function Pill({ t, label, style }: { t: Tone; label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.pill, { backgroundColor: tone[t].bg }, style]}>
      <Dot t={t} size={6} />
      <Text style={[type.pill, { color: tone[t].fg }]}>{label}</Text>
    </View>
  );
}

/** The honest pill on every risky action: "Safe" (he won't notice) or "May notice". */
export function NoticePill({ mayNotice }: { mayNotice?: boolean }) {
  return mayNotice ? <Pill t="act" label="May notice" /> : <Pill t="safe" label="Safe" />;
}

/** Dot + label with no fill, e.g. "Watching", "Caught 1". */
export function StatusText({ t, label }: { t: Tone; label: string }) {
  return (
    <View style={styles.statusText}>
      <Dot t={t} size={7} />
      <Text style={[type.pill, { color: tone[t].fg }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  icon: I,
  onPress,
  height = 56,
  style,
}: {
  label: string;
  icon?: Icon;
  onPress?: () => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.primary, { height }, pressed && { transform: [{ scale: 0.985 }], opacity: 0.94 }, style]}
    >
      {I && <I size={20} color={colors.onPrimary} />}
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, icon: I, onPress }: { label: string; icon?: Icon; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.secondary, pressed && { backgroundColor: colors.lavenderSoft }]}
    >
      {I && <I size={16} weight="bold" color={colors.primary} />}
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

/** 181 / 112 row, shown above the tab bar on every unlocked screen. */
export function HelplineRow() {
  return (
    <View style={styles.helplines}>
      <HelplinePill icon={PhoneIcon} label="181 Women Helpline" tel="181" />
      <HelplinePill icon={SirenIcon} label="112 Emergency" tel="112" />
    </View>
  );
}

function HelplinePill({ icon: I, label, tel }: { icon: Icon; label: string; tel: string }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(`tel:${tel}`)}
      accessibilityRole="link"
      accessibilityLabel={`Call ${label}`}
      style={({ pressed }) => [styles.helpline, pressed && { backgroundColor: colors.lavender }]}
    >
      <I size={15} weight="fill" color={colors.primaryDeep} />
      <Text style={[type.pill, { color: colors.primaryDeep }]}>{label}</Text>
    </Pressable>
  );
}

export const card = {
  backgroundColor: colors.surface,
  borderRadius: 20,
  boxShadow: shadow.card,
} satisfies ViewStyle;

const styles = StyleSheet.create({
  appBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  quickExit: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 13,
    paddingRight: 15,
    borderRadius: 999,
    backgroundColor: colors.lavenderPill,
  },
  quickExitText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primaryDeep },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px -6px rgba(46,38,112,0.3)',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  primary: {
    borderRadius: 20,
    backgroundImage: gradients.primaryButton,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    boxShadow: shadow.button,
  },
  primaryText: { fontFamily: fonts.medium, fontSize: 17, color: colors.onPrimary },
  secondary: {
    height: 44,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(75,63,160,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryText: { fontFamily: fonts.medium, fontSize: 16, color: colors.primary },
  helplines: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingVertical: 8 },
  helpline: {
    flex: 1,
    height: 34,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(75,63,160,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
