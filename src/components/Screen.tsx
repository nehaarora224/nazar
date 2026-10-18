import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '../i18n';
import { useStore } from '../store';
import { colors, space } from '../theme';
import { ErrorBanner } from './ui';

/**
 * Shell for every unlocked screen: cream ground, a header (MainHeader or SubHeader) and a
 * scrolling body. The helpline row and tab bar come from the tab layout, below the scroll area,
 * so content never hides behind them.
 */
export function Screen({ header, children, gap = space.md }: { header: ReactNode; children: ReactNode; gap?: number }) {
  const { status, saveFailed } = useStore();
  const { t } = useT();
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        {header}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.body, { gap }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {status === 'error' && <ErrorBanner text={t('common.loadError')} />}
          {saveFailed && <ErrorBanner text={t('common.saveError')} />}
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  body: { paddingHorizontal: 18, paddingTop: space.xs, paddingBottom: space.xl },
});
