import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, fonts } from '../theme';

const SHIELD = 'M20 3 L34 8.5 V19 C34 28 27.8 34.4 20 37 C12.2 34.4 6 28 6 19 V8.5 Z';
const EYE = 'M11 20.5 C14 16 17 14.5 20 14.5 C23 14.5 26 16 29 20.5 C26 25 23 26.5 20 26.5 C17 26.5 14 25 11 20.5 Z';

/** The shield-and-eye mark. `variant="ghost"` is the translucent version used on the unlock splash. */
export function NazarMark({ size = 24, variant = 'solid' }: { size?: number; variant?: 'solid' | 'ghost' }) {
  const ghost = variant === 'ghost';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d={SHIELD}
        fill={ghost ? 'rgba(251,249,245,0.14)' : colors.primary}
        stroke={ghost ? 'rgba(251,249,245,0.5)' : undefined}
        strokeWidth={ghost ? 0.8 : 0}
      />
      <Path d={EYE} fill={colors.onPrimary} />
      <Circle cx={20} cy={20.5} r={4} fill={colors.primary} />
      {!ghost && <Circle cx={21.4} cy={19.2} r={1.2} fill={colors.onPrimary} />}
    </Svg>
  );
}

/** Just the eye, outlined — sits in the centre of the dashboard ring. */
export function NazarEye({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d={EYE} fill="none" stroke={colors.primary} strokeWidth={1.6} />
      <Circle cx={20} cy={20.5} r={3.4} fill={colors.primary} />
    </Svg>
  );
}

export function Wordmark() {
  return (
    <View style={styles.row}>
      <NazarMark size={24} />
      <Text style={styles.word}>nazar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontFamily: fonts.medium, fontSize: 19, letterSpacing: -0.19, color: colors.primaryDeep },
});
