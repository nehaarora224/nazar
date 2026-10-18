import { router } from 'expo-router';
import { ArrowLeftIcon, CaretRightIcon, Icon, InfoIcon, PhoneIcon, SignOutIcon, SirenIcon, WarningIcon } from 'phosphor-react-native';
import { ReactNode, useEffect, useState } from 'react';
import { Linking, Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';

import { useT } from '../i18n';
import { Lang } from '../store';
import { colors, fonts, radius, shadow, space, TAP, tone, Tone, type } from '../theme';
import { useScreenSize } from './DeviceFrame';
import { Wordmark } from './Logo';

/** Instantly back to the calculator. Present on every unlocked screen. */
export function quickExit() {
  router.dismissTo('/');
}

/** Compact Quick exit: icon + short label, icon only on very narrow screens. */
export function QuickExitButton() {
  const { t } = useT();
  const { width } = useScreenSize();
  const showLabel = width >= 380;
  return (
    <Pressable
      onPress={quickExit}
      accessibilityRole="button"
      accessibilityLabel={t('common.quickExit')}
      hitSlop={4}
      style={({ pressed }) => [styles.quickExit, !showLabel && { paddingHorizontal: 0, width: 40 }, pressed && { backgroundColor: colors.lavenderPillPressed }]}
    >
      <SignOutIcon size={17} weight="bold" color={colors.primaryDeep} />
      {showLabel && <Text style={styles.quickExitText}>{t('common.exit')}</Text>}
    </Pressable>
  );
}

/** English / हिन्दी segmented control. Persists through the store. */
export function LangToggle() {
  const { t, lang, setLang } = useT();
  const opts: { id: Lang; label: string }[] = [
    { id: 'en', label: t('lang.en') },
    { id: 'hi', label: t('lang.hi') },
  ];
  return (
    <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel={t('lang.label')}>
      {opts.map((o) => {
        const on = o.id === lang;
        return (
          <Pressable
            key={o.id}
            onPress={() => setLang(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLanguage={o.id === 'hi' ? 'hi-IN' : 'en-IN'}
            style={[styles.segOpt, on && styles.segOn]}
          >
            <Text style={[styles.segText, on && styles.segTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Header for the main tab screens: logo + wordmark, language, Quick exit. */
export function MainHeader() {
  return (
    <View style={styles.bar}>
      <Wordmark />
      <View style={styles.barRight}>
        <LangToggle />
        <QuickExitButton />
      </View>
    </View>
  );
}

/** Header for detail pages: back, title, Quick exit. */
export function SubHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={styles.bar}>
      <View style={[styles.barLeft, { flex: 1 }]}>
        <BackButton onPress={onBack} />
        <Text style={styles.barTitle} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <QuickExitButton />
    </View>
  );
}

export function BackButton({ onPress }: { onPress?: () => void }) {
  const { t } = useT();
  return (
    <Pressable
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.navigate('/home')))}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={6}
      style={({ pressed }) => [styles.back, pressed && { backgroundColor: colors.lavender }]}
    >
      <ArrowLeftIcon size={18} color={colors.ink} />
    </Pressable>
  );
}

/** Rounded square icon holder used in headers, lists and tiles. */
export function IconChip({
  icon: I,
  size = 34,
  radius: r = 12,
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
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <I size={iconSize} color={fg} weight={weight} />
    </View>
  );
}

export function Dot({ t, size = 8 }: { t: Tone; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone[t].dot }} />;
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
  const { t } = useT();
  return mayNotice ? <Pill t="act" label={t('pill.mayNotice')} /> : <Pill t="safe" label={t('pill.safe')} />;
}

export function PrimaryButton({
  label,
  icon: I,
  onPress,
  disabled,
  style,
}: {
  label: string;
  icon?: Icon;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.primary, pressed && { backgroundColor: colors.primaryDeep }, disabled && { opacity: 0.45 }, style]}
    >
      {I && <I size={20} color={colors.onPrimary} />}
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  icon: I,
  onPress,
  tone: tn,
  style,
}: {
  label: string;
  icon?: Icon;
  onPress?: () => void;
  tone?: 'danger';
  style?: StyleProp<ViewStyle>;
}) {
  const fg = tn === 'danger' ? colors.actFg : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.secondary,
        tn === 'danger' && { borderColor: 'rgba(138,63,53,0.35)' },
        pressed && { backgroundColor: tn === 'danger' ? colors.actBg : colors.lavenderSoft },
        style,
      ]}
    >
      {I && <I size={18} color={fg} />}
      <Text style={[styles.secondaryText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** A button that needs a second tap to confirm, for deletes. No system dialogs (they don't work on web). */
export function ConfirmButton({ label, confirmLabel, onConfirm, icon }: { label: string; confirmLabel: string; onConfirm: () => void; icon?: Icon }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const tm = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(tm);
  }, [armed]);
  return (
    <SecondaryButton
      tone="danger"
      icon={icon}
      label={armed ? confirmLabel : label}
      onPress={() => (armed ? onConfirm() : setArmed(true))}
    />
  );
}

/** Surface card. Pass onPress to make the whole card tappable (with a chevron). */
export function Card({
  children,
  onPress,
  label,
  style,
  chevron = !!onPress,
}: {
  children: ReactNode;
  onPress?: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
  chevron?: boolean;
}) {
  const body = (
    <>
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      {chevron && <CaretRightIcon size={16} weight="bold" color={colors.muted} />}
    </>
  );
  if (!onPress) return <View style={[styles.card, style]}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.card, style, pressed && { backgroundColor: colors.lavenderSoft }]}
    >
      {body}
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={[type.overline, { marginTop: space.sm }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** A quiet explanatory box, used for limitations and "what Nazar can't see". */
export function InfoBox({ title, body, kind = 'info' }: { title?: string; body: string; kind?: 'info' | 'warn' }) {
  const warn = kind === 'warn';
  const I = warn ? WarningIcon : InfoIcon;
  return (
    <View style={[styles.info, warn && { backgroundColor: colors.lookBg }]}>
      <I size={18} color={warn ? colors.lookFg : colors.primary} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {title && <Text style={[type.label, { fontSize: 15 }]}>{title}</Text>}
        <Text style={[type.bodyInk, { lineHeight: 21 }]}>{body}</Text>
      </View>
    </View>
  );
}

/** A selectable answer row (radio-style), at least 48dp tall. */
export function Choice({ label, selected, onPress, t: tn }: { label: string; selected?: boolean; onPress: () => void; t?: Tone }) {
  const c = tn ? tone[tn] : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.choice,
        selected && { borderColor: colors.primary, backgroundColor: colors.lavenderSoft },
        pressed && { backgroundColor: colors.lavender },
      ]}
    >
      <View style={[styles.radio, selected && { borderColor: colors.primary }]}>{selected && <View style={styles.radioDot} />}</View>
      {c && <Dot t={tn!} />}
      <Text style={[type.bodyInk, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

export function NoteInput({ value, onChange, placeholder }: { value: string; onChange: (s: string) => void; placeholder: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      multiline
      maxLength={300}
      accessibilityLabel={placeholder}
      style={styles.input}
    />
  );
}

/** Three compact numbers in a row, e.g. checked / to review / not checked. */
export function Stats({ items }: { items: { label: string; value: string | number; t?: Tone }[] }) {
  return (
    <View style={styles.stats}>
      {items.map((it, i) => (
        <View key={it.label} style={[styles.stat, i > 0 && styles.statDivider]}>
          <Text style={[styles.statValue, it.t && { color: tone[it.t].fg }]} numberOfLines={2}>
            {it.value}
          </Text>
          <Text style={styles.statLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Red-tinted banner for storage failures. */
export function ErrorBanner({ text }: { text: string }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <WarningIcon size={18} color={colors.actFg} />
      <Text style={[type.bodyInk, { flex: 1, color: colors.actFg }]}>{text}</Text>
    </View>
  );
}

/** 181 / 112 row, shown above the tab bar on every unlocked screen. */
export function HelplineRow() {
  const { t } = useT();
  return (
    <View style={styles.helplines}>
      <HelplinePill icon={PhoneIcon} label={t('help.181')} tel="181" a11y={t('help.call', { name: t('help.181') })} />
      <HelplinePill icon={SirenIcon} label={t('help.112')} tel="112" a11y={t('help.call', { name: t('help.112') })} />
    </View>
  );
}

function HelplinePill({ icon: I, label, tel, a11y }: { icon: Icon; label: string; tel: string; a11y: string }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(`tel:${tel}`)}
      accessibilityRole="link"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.helpline, pressed && { backgroundColor: colors.lavender }]}
    >
      <I size={15} weight="fill" color={colors.primaryDeep} />
      <Text style={[type.pill, { color: colors.primaryDeep }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export const card = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.hairline,
  boxShadow: shadow.card,
} satisfies ViewStyle;

const styles = StyleSheet.create({
  bar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, gap: space.sm },
  barLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  barRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  barTitle: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  quickExit: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.lavenderPill,
  },
  quickExitText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primaryDeep },
  seg: { flexDirection: 'row', height: 40, padding: 3, borderRadius: radius.pill, backgroundColor: colors.lavender },
  segOpt: { minWidth: 58, paddingHorizontal: 10, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.surface, boxShadow: '0px 1px 3px rgba(46,38,112,0.18)' },
  segText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  segTextOn: { color: colors.primaryDeep, fontFamily: fonts.semibold },
  back: {
    width: TAP - 4,
    height: TAP - 4,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  primary: {
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: { fontFamily: fonts.medium, fontSize: 16, color: colors.onPrimary, textAlign: 'center' },
  secondary: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(75,63,160,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryText: { fontFamily: fonts.medium, fontSize: 15, color: colors.primary, textAlign: 'center' },
  card: { ...card, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  info: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: colors.lavenderSoft },
  choice: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.checkOff, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  input: {
    minHeight: 76,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: 'top',
    outlineColor: colors.primary,
  },
  stats: { ...card, flexDirection: 'row', paddingVertical: 14, boxShadow: 'none' },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.hairline },
  statValue: { fontFamily: fonts.medium, fontSize: 20, color: colors.ink, textAlign: 'center' },
  statLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: radius.md, backgroundColor: colors.actBg },
  helplines: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingVertical: 8 },
  helpline: {
    flex: 1,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(75,63,160,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
});
