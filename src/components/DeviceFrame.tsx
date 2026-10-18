import { BatteryHighIcon, CellSignalFullIcon, WifiHighIcon } from 'phosphor-react-native';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaFrameContext, SafeAreaInsetsContext } from 'react-native-safe-area-context';

/** The phone screen we preview on desktop: a common 412×892 dp Android handset (the size the designs use). */
const SCREEN = { width: 412, height: 892 };
const BEZEL = 12;
const MARGIN = 24;
/** Below this the screen gets too short to hold the calculator keypad; the page scrolls instead. */
const MIN_SCREEN_HEIGHT = 600;
/** Wider than this (and on web) we draw the device; narrower windows are treated as phones. */
const DESKTOP_MIN_WIDTH = 600;

/** Simulated system bars inside the frame, so screens pad themselves exactly as on a device. */
const INSETS = { top: 32, bottom: 16, left: 0, right: 0 };

type ScreenSize = { width: number; height: number };
const ScreenSizeContext = createContext<ScreenSize | null>(null);

/**
 * The size of the app's screen: the phone frame's screen in the desktop preview,
 * otherwise the window. Use this instead of useWindowDimensions for layout.
 */
export function useScreenSize(): ScreenSize {
  const frame = useContext(ScreenSizeContext);
  const win = useWindowDimensions();
  return frame ?? { width: win.width, height: win.height };
}

/**
 * On desktop browsers, shows the app inside a centred phone. On native and on narrow
 * (mobile) browsers it renders children untouched, full screen.
 */
export function DeviceFrame({ children }: { children: ReactNode }) {
  const win = useWindowDimensions();
  const desktop = Platform.OS === 'web' && win.width >= DESKTOP_MIN_WIDTH;
  if (!desktop) return <>{children}</>;

  const height = Math.max(MIN_SCREEN_HEIGHT, Math.min(SCREEN.height, win.height - 2 * (MARGIN + BEZEL)));
  const size = { width: SCREEN.width, height };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageInner}>
      <View style={styles.device}>
        <View style={[styles.screen, size]}>
          <ScreenSizeContext.Provider value={size}>
            <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, ...size }}>
              <SafeAreaInsetsContext.Provider value={INSETS}>{children}</SafeAreaInsetsContext.Provider>
            </SafeAreaFrameContext.Provider>
          </ScreenSizeContext.Provider>
          <StatusBarMock />
          <View style={styles.gesture} pointerEvents="none">
            <View style={styles.gestureBar} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function StatusBarMock() {
  const [time, setTime] = useState(clock);
  useEffect(() => {
    const t = setInterval(() => setTime(clock()), 15_000);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={styles.statusBar} pointerEvents="none">
      <Text style={styles.time}>{time}</Text>
      <View style={styles.camera} />
      <View style={styles.statusIcons}>
        <CellSignalFullIcon size={15} weight="fill" color="#202124" />
        <WifiHighIcon size={15} weight="fill" color="#202124" />
        <BatteryHighIcon size={15} weight="fill" color="#202124" />
      </View>
    </View>
  );
}

function clock() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#ECEAF0',
    backgroundImage:
      'radial-gradient(1200px 600px at 20% -10%, #E7E3F3 0%, rgba(231,227,243,0) 70%), radial-gradient(900px 500px at 90% 110%, #E3ECE6 0%, rgba(227,236,230,0) 70%)',
  },
  pageInner: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: MARGIN },
  device: {
    padding: BEZEL,
    borderRadius: 54,
    backgroundColor: '#1C1B22',
    borderWidth: 1.5,
    borderColor: '#3A3944',
    boxShadow: '0px 40px 80px -30px rgba(31,28,46,0.40), 0px 12px 30px -12px rgba(31,28,46,0.25)',
  },
  screen: { borderRadius: 42, overflow: 'hidden', backgroundColor: '#F7F7F7' },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: INSETS.top,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
  },
  time: { fontSize: 14, fontWeight: '500', color: '#202124' },
  camera: { position: 'absolute', left: '50%', top: 10, width: 12, height: 12, marginLeft: -6, borderRadius: 6, backgroundColor: '#111' },
  statusIcons: { flexDirection: 'row', gap: 5 },
  gesture: { position: 'absolute', left: 0, right: 0, bottom: 0, height: INSETS.bottom, alignItems: 'center', justifyContent: 'center' },
  gestureBar: { width: 108, height: 4, borderRadius: 2, backgroundColor: '#1F1C2E', opacity: 0.55 },
});
