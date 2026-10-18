import { router } from 'expo-router';
import {
  ArrowLeftIcon,
  CalculatorIcon,
  CaretRightIcon,
  Icon,
  InfoIcon,
  PhoneIcon,
  SignOutIcon,
  SirenIcon,
  WarningIcon,
} from 'phosphor-react-native';
import { ReactNode, useEffect, useState } from 'react';
import { Animated, Linking, Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';

import { useT } from '../i18n';
import { Lang, useStore } from '../store';
import { colors, fonts, radius, shadow, space, TAP, tone, Tone, type } from '../theme';
import { useScreenSize } from './DeviceFrame';
import { Wordmark } from './Logo';
import { SheetHead, useOverlay } from './Overlay';

/** Instantly back to the calculator. */
export function quickExit() {
  router.dismissTo('/');
}

/** The Exit button: asks once ("Leave Nazar now?"), then goes straight to the calculator. */
export function QuickExitButton() {
  const { t } = useT();
  const { width } = useScreenSize();
  const { openSheet, closeSheet } = useOverlay();
  const showLabel = width >= 360;
  const ask = () =>
    openSheet(
      <>
        <SheetHead title={t('exit.q')} body={t('exit.body')} />
        <PrimaryButton
          icon={CalculatorIcon}
          label={t('exit.go')}
          onPress={() => {
            closeSheet();
            quickExit();
          }}
        />
        <TonalButton label={t('exit.stay')} onPress={closeSheet} />
      </>,
    );
  return (
    <Pressable
      onPress={ask}
      accessibilityRole="button"
      accessibilityLabel={t('common.quickExit')}
      hitSlop={4}
      style={({ pressed }) => [styles.exit, !showLabel && { width: 40, paddingHorizontal: 0 }, pressed && { backgroundColor: colors.primaryDeep }]}
    >
      <SignOutIcon size={16} weight="bold" color={colors.onPrimary} />
      {showLabel && <Text style={styles.exitText}>{t('common.exit')}</Text>}
    </Pressable>
  );
}

/** EN / हिं segmented control. Persists through the store. */
export function LangToggle() {
  const { t, lang, setLang } = useT();
  const opts: { id: Lang; label: string; a11y: string }[] = [
    { id: 'en', label: 'EN', a11y: t('lang.en') },
    { id: 'hi', label: 'हिं', a11y: t('lang.hi') },
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
            accessibilityLabel={o.a11y}
            accessibilityState={{ selected: on }}
            style={[styles.segOpt, on && styles.segOn]}
          >
            <Text style={[styles.segText, on && styles.segTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Header for the main tab screens: logo + wordmark, language, Exit. */
export function MainHeader() {
  return (
    <View style={styles.bar}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Wordmark />
      </View>
      <LangToggle />
      <QuickExitButton />
    </View>
  );
}

/** Header for detail pages: back, title, language, Exit. */
export function SubHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={styles.bar}>
      <View style={[styles.barLeft, { flex: 1 }]}>
        <BackButton onPress={onBack} />
        <Text style={styles.barTitle} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <LangToggle />
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

/** Page title block: optional kicker, large title, supporting line. */
export function PageTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={styles.pageTitle} accessibilityRole="header">
        {title}
      </Text>
      {sub ? <Text style={[type.body, { lineHeight: 22 }]}>{sub}</Text> : null}
    </View>
  );
}

/** Rounded square icon holder used in headers, lists and tiles. */
export function IconChip({
  icon: I,
  size = 40,
  radius: r = 13,
  iconSize = 20,
  bg = colors.lavenderSoft,
  fg = colors.primary,
  weight = 'regular',
  solid,
}: {
  icon: Icon;
  size?: number;
  radius?: number;
  iconSize?: number;
  bg?: string;
  fg?: string;
  weight?: 'regular' | 'fill' | 'bold';
  /** The gradient indigo tile used for the Bait Test. */
  solid?: boolean;
}) {
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        solid && { backgroundImage: 'linear-gradient(150deg, #5547B3, #3D3290)', backgroundColor: colors.primary },
      ]}
    >
      <I size={iconSize} color={solid ? colors.onPrimary : fg} weight={weight} />
    </View>
  );
}

export function Dot({ t, size = 8, halo }: { t: Tone; size?: number; halo?: boolean }) {
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

/** Dot + coloured label, as in the Home design's check rows. */
export function StatusLine({ t, label, sample }: { t: Tone; label: string; sample?: boolean }) {
  return (
    <View style={styles.statusLine}>
      <Dot t={t} />
      <Text style={[styles.statusText, { color: tone[t].fg }]} numberOfLines={2}>
        {label}
      </Text>
      {sample && <SampleBadge />}
    </View>
  );
}

/** The honest pill on every risky action: "Safe" (he won't notice) or "May notice". */
export function NoticePill({ mayNotice }: { mayNotice?: boolean }) {
  const { t } = useT();
  return mayNotice ? <Pill t="act" label={t('pill.mayNotice')} /> : <Pill t="safe" label={t('pill.safe')} />;
}

/** Marks illustrative data. Shown on every sample item. */
export function SampleBadge() {
  const { t } = useT();
  return (
    <View style={styles.sample} accessibilityLabel={t('sample.badgeA11y')}>
      <Text style={styles.sampleText}>{t('sample.badge')}</Text>
    </View>
  );
}

/** Page-level note that sample data is included, with a switch to hide or show it. */
export function SampleBanner() {
  const { data, setShowSample } = useStore();
  const { t } = useT();
  return (
    <View style={styles.sampleBanner}>
      <Text style={[type.pill, { flex: 1, color: colors.neutralFg, fontFamily: fonts.medium }]}>
        {data.showSample ? t('sample.on') : t('sample.off')}
      </Text>
      <Pressable onPress={() => setShowSample(!data.showSample)} accessibilityRole="button" hitSlop={8} style={styles.sampleBtn}>
        <Text style={[type.pill, { color: colors.primary }]}>{data.showSample ? t('sample.hide') : t('sample.show')}</Text>
      </Pressable>
    </View>
  );
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
      {I && <I size={19} color={colors.onPrimary} weight="bold" />}
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

/** Outlined button (1.5px indigo border), the Home design's secondary action. */
export function SecondaryButton({
  label,
  icon: I,
  onPress,
  tone: tn,
  disabled,
  style,
}: {
  label: string;
  icon?: Icon;
  onPress?: () => void;
  tone?: 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fg = tn === 'danger' ? colors.actFg : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.secondary,
        tn === 'danger' && { borderColor: 'rgba(138,63,53,0.35)' },
        pressed && { backgroundColor: tn === 'danger' ? colors.actBg : colors.lavenderSoft },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {I && <I size={17} color={fg} weight="bold" />}
      <Text style={[styles.secondaryText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Soft lavender button, e.g. "Run tracker check" inside a list row. */
export function TonalButton({ label, icon: I, onPress, style }: { label: string; icon?: Icon; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.tonal, pressed && { backgroundColor: colors.lavenderPill }, style]}
    >
      {I && <I size={17} color={colors.primaryDeep} weight="bold" />}
      <Text style={styles.tonalText}>{label}</Text>
    </Pressable>
  );
}

/** A button that needs a second tap to confirm, for deletes. */
export function ConfirmButton({ label, confirmLabel, onConfirm, icon }: { label: string; confirmLabel: string; onConfirm: () => void; icon?: Icon }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const tm = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(tm);
  }, [armed]);
  return <SecondaryButton tone="danger" icon={icon} label={armed ? confirmLabel : label} onPress={() => (armed ? onConfirm() : setArmed(true))} />;
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
      {chevron && <CaretRightIcon size={16} weight="bold" color={colors.primary} />}
    </>
  );
  if (!onPress) return <View style={[styles.card, style]}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.card, style, pressed && { backgroundColor: colors.warmRow }]}
    >
      {body}
    </Pressable>
  );
}

/** A titled card holding divided rows, like the Home design's "Checks" card. */
export function ListCard({ title, count, children, right }: { title?: string; count?: number | string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.listCard}>
      {title ? (
        <View style={styles.listHead}>
          <Text style={styles.listTitle} accessibilityRole="header">
            {title}
          </Text>
          {right ?? (count !== undefined ? <Text style={styles.countBadge}>{count}</Text> : null)}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** One row in a ListCard: icon, title, status, chevron, description and optional action. */
export function ListRow({
  icon,
  title,
  status,
  desc,
  meta,
  onPress,
  first,
  action,
  label,
  iconBg,
  iconFg,
}: {
  icon: Icon;
  title: string;
  status?: ReactNode;
  desc?: string;
  meta?: string;
  onPress?: () => void;
  first?: boolean;
  action?: ReactNode;
  label?: string;
  iconBg?: string;
  iconFg?: string;
}) {
  return (
    <View style={[styles.rowWrap, !first && styles.rowDivider]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={label}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.warmRow }]}
      >
        <IconChip icon={icon} bg={iconBg} fg={iconFg} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          {status}
          {desc ? <Text style={[type.body, { lineHeight: 21 }]}>{desc}</Text> : null}
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        {onPress && <CaretRightIcon size={16} weight="bold" color={colors.primary} />}
      </Pressable>
      {action ? <View style={styles.rowAction}>{action}</View> : null}
    </View>
  );
}

/** A big-number tile, e.g. "2 · Active baits". */
export function StatTile({ value, label, alert, small }: { value: string | number; label: string; alert?: boolean; small?: boolean }) {
  return (
    <View style={[styles.tile, alert && { backgroundColor: colors.statAlert }]}>
      <Text style={[styles.tileValue, small && { fontSize: 16, lineHeight: 21 }, alert && { color: colors.actFg }]} numberOfLines={2}>
        {value}
      </Text>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** Pulsing placeholder for loading states. */
export function Skeleton({ height = 16, width, style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const [a] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={[{ height, width, borderRadius: 14, backgroundColor: colors.offBg, opacity: a }, style]} />;
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={[type.overline, { marginTop: space.sm }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** A quiet explanatory box, used for limitations and "what Nazar can't see". */
export function InfoBox({ title, body, kind = 'info', children }: { title?: string; body?: string; kind?: 'info' | 'warn' | 'error'; children?: ReactNode }) {
  const I = kind === 'info' ? InfoIcon : WarningIcon;
  const bg = kind === 'warn' ? colors.lookBg : kind === 'error' ? colors.actBg : colors.lavenderSoft;
  const fg = kind === 'warn' ? colors.lookFg : kind === 'error' ? colors.actFg : colors.primary;
  return (
    <View style={[styles.info, { backgroundColor: bg }]}>
      <I size={19} color={fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 4 }}>
        {title && <Text style={[type.label, { fontSize: 15 }]}>{title}</Text>}
        {body ? <Text style={[type.bodyInk, { lineHeight: 21 }]}>{body}</Text> : null}
        {children}
      </View>
    </View>
  );
}

/** A selectable answer row (radio-style), at least 50dp tall. */
export function Choice({ label, desc, selected, onPress, t: tn, icon: I }: { label: string; desc?: string; selected?: boolean; onPress: () => void; t?: Tone; icon?: Icon }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.choice, selected && { borderColor: colors.primary, backgroundColor: colors.lavenderSoft }, pressed && { backgroundColor: colors.lavender }]}
    >
      <View style={[styles.radio, selected && { borderColor: colors.primary }]}>{selected && <View style={styles.radioDot} />}</View>
      {I ? <I size={19} color={colors.primary} /> : tn ? <Dot t={tn} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.bodyInk}>{label}</Text>
        {desc ? <Text style={[type.body, { fontSize: 14, lineHeight: 19 }]}>{desc}</Text> : null}
      </View>
    </Pressable>
  );
}

export function NoteInput({ value, onChange, placeholder, multiline = true }: { value: string; onChange: (s: string) => void; placeholder: string; multiline?: boolean }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      multiline={multiline}
      maxLength={300}
      accessibilityLabel={placeholder}
      style={[styles.input, !multiline && { minHeight: 52 }]}
    />
  );
}

/** Labelled single-line field. */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  keyboardType,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: 'email-address' | 'default';
  autoComplete?: 'email' | 'off';
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={type.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        autoComplete={autoComplete}
        autoCorrect={false}
        maxLength={80}
        style={[styles.input, { minHeight: 52 }, error && { borderColor: colors.act }]}
      />
      {error ? (
        <Text style={[type.pill, { color: colors.actFg }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Three compact numbers in a row, e.g. checked / to review / not checked. */
export function Stats({ items }: { items: { label: string; value: string | number; t?: Tone; small?: boolean }[] }) {
  return (
    <View style={styles.stats}>
      {items.map((it) => (
        <View key={it.label} style={[styles.statCell, it.t && it.t !== 'off' && { backgroundColor: tone[it.t].bg }]}>
          <Text style={[styles.tileValue, { fontSize: it.small ? 15 : 22, lineHeight: it.small ? 20 : 28 }, it.t && { color: tone[it.t].fg }]} numberOfLines={2}>
            {it.value}
          </Text>
          <Text style={styles.tileLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Segmented tabs inside a page (e.g. Accounts · Devices · Sharing). */
export function Tabs<K extends string>({ items, value, onChange }: { items: { key: K; label: string; count?: number }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, on && styles.tabOn]}>
            <Text style={[styles.tabText, on && { color: colors.primaryNight }]} numberOfLines={1}>
              {it.label}
              {it.count !== undefined ? ` · ${it.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontal filter chips. */
export function Chips<K extends string>({ items, value, onChange }: { items: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={styles.chips}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
            <Text style={[type.pill, { color: on ? colors.onPrimary : colors.primaryDeep }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Red-tinted banner for storage failures. */
export function ErrorBanner({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const { t } = useT();
  return (
    <View style={styles.error} accessibilityRole="alert">
      <WarningIcon size={18} color={colors.actFg} />
      <Text style={[type.bodyInk, { flex: 1, color: colors.actFg }]}>{text}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
          <Text style={[type.pill, { color: colors.primary }]}>{t('common.retry')}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Empty state block inside a card. */
export function Empty({ icon: I, title, body, action }: { icon: Icon; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <IconChip icon={I} size={48} radius={16} iconSize={23} bg={colors.lavender} />
      <Text style={[type.title, { textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[type.body, { textAlign: 'center' }]}>{body}</Text> : null}
      {action}
    </View>
  );
}

/** 181 / 112 row, shown above the tab bar on every unlocked screen. */
export function HelplineRow() {
  const { t } = useT();
  return (
    <View style={styles.helplines}>
      <HelplinePill icon={PhoneIcon} label={t('help.181')} tel="181" a11y={t('help.call', { name: t('help.181') })} />
      <HelplinePill icon={SirenIcon} label={t('help.112')} tel="112" a11y={t('help.call', { name: t('help.112') })} danger />
    </View>
  );
}

function HelplinePill({ icon: I, label, tel, a11y, danger }: { icon: Icon; label: string; tel: string; a11y: string; danger?: boolean }) {
  const fg = danger ? colors.actFg : colors.primaryDeep;
  return (
    <Pressable
      onPress={() => Linking.openURL(`tel:${tel}`)}
      accessibilityRole="link"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.helpline, danger && { borderColor: 'rgba(192,103,90,0.35)' }, pressed && { backgroundColor: danger ? colors.actBg : colors.lavender }]}
    >
      <I size={17} weight="fill" color={fg} />
      <Text style={[styles.helplineText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export const card = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  boxShadow: shadow.card,
} satisfies ViewStyle;

const styles = StyleSheet.create({
  bar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 16, gap: space.sm },
  barLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  barTitle: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  exit: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  exitText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onPrimary },
  seg: { flexDirection: 'row', height: 40, padding: 3, borderRadius: radius.pill, backgroundColor: colors.langTrack },
  segOpt: { minWidth: 46, paddingHorizontal: 12, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.surface, boxShadow: '0px 2px 6px -2px rgba(46,38,112,0.3)' },
  segText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  segTextOn: { color: colors.primaryNight },
  back: { width: TAP - 4, height: TAP - 4, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', boxShadow: shadow.soft },
  kicker: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primary },
  pageTitle: { fontFamily: fonts.medium, fontSize: 28, lineHeight: 33, letterSpacing: -0.6, color: colors.ink },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  statusText: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  sample: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 1, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(74,70,63,0.35)', borderStyle: 'dashed' },
  sampleText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.neutralFg },
  sampleBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.neutralBg },
  sampleBtn: { minHeight: 32, justifyContent: 'center' },
  primary: {
    minHeight: 50,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { fontFamily: fonts.medium, fontSize: 16, color: colors.onPrimary, textAlign: 'center' },
  secondary: {
    minHeight: 46,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(75,63,160,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primary, textAlign: 'center' },
  tonal: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.lavender,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tonalText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primaryDeep, textAlign: 'center' },
  card: { ...card, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  listCard: { ...card, overflow: 'hidden', paddingBottom: 4 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingHorizontal: 16, paddingBottom: 6, gap: 8 },
  listTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  countBadge: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.muted,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralBg,
    overflow: 'hidden',
  },
  rowWrap: { marginHorizontal: 10 },
  rowDivider: { borderTopWidth: 1, borderTopColor: 'rgba(31,28,46,0.07)' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 16 },
  rowTitle: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 20, color: colors.ink },
  rowAction: { paddingLeft: 58, paddingRight: 6, paddingBottom: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  tile: { flex: 1, gap: 2, paddingVertical: 11, paddingHorizontal: 13, borderRadius: radius.sm, backgroundColor: colors.statTile },
  tileValue: { fontFamily: fonts.medium, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, color: colors.primaryNight },
  tileLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  info: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md },
  choice: {
    minHeight: 52,
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
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
    textAlignVertical: 'top',
    outlineColor: colors.primary,
  },
  stats: { flexDirection: 'row', gap: 8 },
  statCell: { flex: 1, gap: 2, paddingVertical: 11, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.statTile },
  tabs: { flexDirection: 'row', padding: 3, borderRadius: radius.pill, backgroundColor: colors.langTrack },
  tab: { flex: 1, minHeight: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  tabOn: { backgroundColor: colors.surface, boxShadow: '0px 2px 6px -2px rgba(46,38,112,0.3)' },
  tabText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary },
  chipOff: { backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(75,63,160,0.18)' },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: radius.md, backgroundColor: colors.actBg },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl, paddingHorizontal: space.lg },
  helplines: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  helpline: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(75,63,160,0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 6,
  },
  helplineText: { fontFamily: fonts.semibold, fontSize: 15 },
});
