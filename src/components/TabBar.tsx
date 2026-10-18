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
  'digital-footprint-audit': 'home',
  'audit-module': 'home',
  'audit-report': 'home',
  tracker: 'home',
  'tracker-detail': 'home',
  bait: 'home',
  'bait-new': 'home',
  'bait-detail': 'home',
  session: 'home',
  evidence: 'vault',
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
                <I size={21} weight={on ? 'fill' : 'regular'} color={on ? colors.primary : colors.muted} />
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
  wrap: { backgroundImage: 'linear-gradient(180deg, rgba(246,243,238,0) 0%, #F6F3EE 30%)' },
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,28,46,0.07)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    minHeight: 64,
    paddingTop: 7,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingBottom: 3 },
  indicator: { width: 60, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  labelOn: { fontFamily: fonts.semibold, color: colors.primary },
});
