import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius } from '../theme';

/**
 * Bottom sheets, dialogs and toasts, drawn inside the app root (so on desktop web they stay
 * inside the phone frame rather than covering the browser).
 */
type Overlay = {
  openSheet: (node: ReactNode, opts?: { onDismiss?: () => void }) => void;
  closeSheet: () => void;
  toast: (msg: string) => void;
};

const Ctx = createContext<Overlay | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<{ node: ReactNode; onDismiss?: () => void } | null>(null);
  const [toastMsg, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const insets = useSafeAreaInsets();

  const closeSheet = useCallback(() => setSheet(null), []);
  const dismiss = useCallback(() => {
    setSheet((s) => {
      s?.onDismiss?.();
      return null;
    });
  }, []);
  const value = useMemo<Overlay>(
    () => ({
      openSheet: (node, opts) => setSheet({ node, onDismiss: opts?.onDismiss }),
      closeSheet,
      toast: (msg) => {
        setToast(msg);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast(''), 2400);
      },
    }),
    [closeSheet],
  );

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!sheet) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
  }, [sheet, dismiss]);

  return (
    <Ctx.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {!!toastMsg && (
          <View style={[styles.toast, { bottom: 150 + insets.bottom }]} accessibilityLiveRegion="polite" accessibilityRole="alert" pointerEvents="none">
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        )}
        {sheet && (
          <View style={styles.backdrop} accessibilityViewIsModal>
            <Pressable style={{ flex: 1 }} onPress={dismiss} accessibilityLabel="Close" />
            <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
              <View style={styles.grip} />
              <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled" bounces={false}>
                {sheet.node}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </Ctx.Provider>
  );
}

export function useOverlay() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOverlay must be used inside OverlayProvider');
  return v;
}

/** Title + body block used at the top of every sheet. */
export function SheetHead({ title, body }: { title: string; body?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31,28,46,0.42)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '86%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 14,
  },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 4, backgroundColor: '#D8D3CB' },
  title: { fontFamily: fonts.medium, fontSize: 21, lineHeight: 27, letterSpacing: -0.2, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
  toast: {
    position: 'absolute',
    left: 18,
    right: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.primaryNight,
    boxShadow: '0px 16px 30px -12px rgba(31,28,46,0.5)',
  },
  toastText: { fontFamily: fonts.regular, fontSize: 15, color: colors.onPrimary },
});
