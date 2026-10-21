import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { NazarTabBar } from '../../components/TabBar';
import { quickExit } from '../../components/ui';
import { session } from '../../session';
import { colors } from '../../theme';

export default function NazarLayout() {
  // If she switches away (or the phone is handed over), come back to the calculator.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') quickExit();
    });
    return () => sub.remove();
  }, []);

  // Never reachable by URL, reload or deep link: only through the calculator code.
  if (!session.isUnlocked()) return <Redirect href="/" />;

  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <NazarTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.cream } }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="exposure" />
      <Tabs.Screen name="vault" />
      <Tabs.Screen name="plan" />
      {/* Detail screens: routable, but NazarTabBar only draws the four tabs above. */}
      <Tabs.Screen name="accounts" />
      <Tabs.Screen name="account-check" />
      <Tabs.Screen name="account-item" />
      <Tabs.Screen name="digital-footprint-audit" />
      <Tabs.Screen name="audit-module" />
      <Tabs.Screen name="audit-report" />
      <Tabs.Screen name="permission-audit" />
      <Tabs.Screen name="tracker" />
      <Tabs.Screen name="tracker-detail" />
      <Tabs.Screen name="ble-scan" />
      <Tabs.Screen name="bait" />
      <Tabs.Screen name="bait-new" />
      <Tabs.Screen name="bait-detail" />
      <Tabs.Screen name="session" />
      <Tabs.Screen name="evidence" />
      <Tabs.Screen name="vault-add" />
    </Tabs>
  );
}
