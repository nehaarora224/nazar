import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { EyeIcon, HouseSimpleIcon, Icon, LockSimpleIcon, PathIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TKey, useT } from '../i18n';
import { colors, fonts } from '../theme';
import { HelplineRow } from './ui';

const TABS: { name: string; label: TKey; icon: Icon }[] = [
  { name: 'home', label: 'tab.home', icon: HouseSimpleIcon },
  { name: 'exposure', label: 'tab.exposure', icon: EyeIcon },
  { name: 'vault', label: 'tab.vault', icon: LockSimpleIcon },
  { name: 'plan', label: 'tab.plan', icon: PathIcon },
];

/** Detail screens that live under a tab without having their own. */
const PARENT_TAB: Record<string, string> = {
  accounts: 'home',
  'account-check': 'home',
  'account-item': 'home',
  'quiet-check': 'home',
  tracker: 'home',
  'tracker-detail': 'home',
  bait: 'home',
  'bait-new': 'home',
  'bait-detail': 'home',
};

export function NazarTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const current = state.routes[state.index]?.name ?? 'home';
  const active = PARENT_TAB[current] ?? current;

  return (
    <View style={styles.wrap}>
      <HelplineRow />
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        {TABS.map(({ name, label: key, icon: I }) => {
          const label = t(key);
          const on = name === active;
          const route = state.routes.find((r) => r.name === name);
          return (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={label}
              onPress={() => route && navigateToTab(route.key)}
              style={styles.tab}
            >
              <View style={[styles.indicator, on && { backgroundColor: colors.lavender }]}>
                <I size={20} weight={on ? 'fill' : 'regular'} color={on ? colors.primary : colors.muted} />
              </View>
              <Text style={[styles.label, on && styles.labelOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.cream },
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  tab: { alignItems: 'center', gap: 3, minWidth: 72, paddingBottom: 4 },
  indicator: { width: 58, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  labelOn: { fontFamily: fonts.semibold, color: colors.primary },
});
