import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '../i18n';
import { useStore } from '../store';
import { colors, screenWash, space } from '../theme';
import { ErrorBanner } from './ui';

/**
 * Shell for every unlocked screen: cream ground, a header (MainHeader or SubHeader) and a
 * scrolling body. The helpline row and tab bar come from the tab layout, below the scroll area,
 * so content never hides behind them.
 */
export function Screen({ header, children, gap = 18 }: { header: ReactNode; children: ReactNode; gap?: number }) {
  const { status, saveFailed, retryLoad } = useStore();
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
          {status === 'error' && <ErrorBanner text={t('common.loadError')} onRetry={retryLoad} />}
          {saveFailed && <ErrorBanner text={t('common.saveError')} />}
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream, backgroundImage: screenWash },
  flex: { flex: 1 },
  body: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: space.xl },
});
