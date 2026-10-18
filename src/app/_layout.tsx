import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DeviceFrame } from '../components/DeviceFrame';
import { NazarProvider } from '../state';

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });

  return (
    <SafeAreaProvider>
      <NazarProvider>
        <StatusBar style="dark" />
        <DeviceFrame>
          {loaded ? (
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
              <Stack.Screen name="index" />
              {/* No swipe-back into Nazar's screens from the calculator, and no slide that reveals it. */}
              <Stack.Screen name="(nazar)" options={{ gestureEnabled: false, animation: 'fade' }} />
            </Stack>
          ) : (
            // The calculator ground, so a cold start never flashes anything unusual.
            <View style={{ flex: 1, backgroundColor: '#F7F7F7' }} />
          )}
        </DeviceFrame>
      </NazarProvider>
    </SafeAreaProvider>
  );
}

