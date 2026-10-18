import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme';
import { AppBar } from './ui';

/**
 * Shell for every unlocked screen: cream (optionally tinted) ground, the app bar with
 * Quick exit, and a scrolling body. The helpline row and tab bar come from the tab layout.
 */
export function Screen({
  header,
  children,
  background,
  gap = 12,
  padTop = 6,
}: {
  header: ReactNode;
  children: ReactNode;
  /** A CSS gradient for the top of the screen, e.g. the lavender wash on Home. */
  background?: string;
  gap?: number;
  padTop?: number;
}) {
  const bg: ViewStyle = background ? { backgroundImage: background } : {};
  return (
    <View style={[styles.root, bg]}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <AppBar>{header}</AppBar>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.body, { gap, paddingTop: padTop }]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  body: { paddingHorizontal: 18, paddingBottom: 14 },
});
