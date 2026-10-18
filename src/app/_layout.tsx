import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NazarProvider } from '../state';

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });

  return (
    <SafeAreaProvider>
      <NazarProvider>
        <StatusBar style="dark" />
        <View style={styles.frame}>
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
        </View>
      </NazarProvider>
    </SafeAreaProvider>
  );
}

// In a desktop browser (the web demo), keep the app at phone width instead of stretching it.
const styles = StyleSheet.create({
  frame: Platform.select({
    web: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', overflow: 'hidden', boxShadow: '0px 0px 40px rgba(46,38,112,0.12)' },
    default: { flex: 1 },
  }),
});
