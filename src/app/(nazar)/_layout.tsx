import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { NazarTabBar } from '../../components/TabBar';
import { quickExit } from '../../components/ui';
import { colors } from '../../theme';

export default function NazarLayout() {
  // If she switches away (or the phone is handed over), come back to the calculator.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') quickExit();
    });
    return () => sub.remove();
  }, []);

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
      <Tabs.Screen name="tracker" />
      <Tabs.Screen name="bait" />
    </Tabs>
  );
}
