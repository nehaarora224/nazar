import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BackspaceIcon, CaretDownIcon, ClockCounterClockwiseIcon, DotsThreeVerticalIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { evaluate, formatResult } from '../calc';
import { NazarMark } from '../components/Logo';
import { colors, fonts } from '../theme';

/** Her private code. Typing it and pressing = opens Nazar. */
const SECRET = '1947';
const START = { expr: '720 + 173', display: '893' };

const KEYS = ['AC', '( )', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '⌫', '='];
const FUNCTION_KEYS = ['AC', '( )', '%'];
const OPERATORS = ['÷', '×', '−', '+'];

/**
 * Screen 01 — The Disguise. A stock-looking Android calculator: neutral greys, the system
 * font, no Nazar styling. It really calculates.
 */
export default function Calculator() {
  const [expr, setExpr] = useState(START.expr);
  const [display, setDisplay] = useState(START.display);
  const [unlocking, setUnlocking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { width } = useWindowDimensions();
  const key = Math.min(80, Math.floor((width - 32 - 36) / 4));

  // Whenever we land back here (Quick exit, app resumed), look untouched.
  useFocusEffect(
    useCallback(() => {
      setExpr(START.expr);
      setDisplay(START.display);
      setUnlocking(false);
    }, []),
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  function press(k: string) {
    const fresh = expr.endsWith('=') || expr === START.expr;
    if (k === 'AC') {
      setExpr('');
      setDisplay('0');
      return;
    }
    if (k === '⌫') {
      const next = fresh ? '' : expr.slice(0, -1);
      setExpr(next);
      setDisplay(next || '0');
      return;
    }
    if (k === '=') {
      if (expr.replace(/\s/g, '') === SECRET) {
        setUnlocking(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => router.push('/home'), 900);
        return;
      }
      const v = evaluate(expr);
      setExpr(expr + ' =');
      setDisplay(v == null ? 'Error' : formatResult(v));
      return;
    }
    let next = fresh ? (/[0-9.]/.test(k) || k === '( )' ? '' : display === 'Error' ? '' : display) : expr;
    let ch = k;
    if (k === '( )') {
      const open = (next.match(/\(/g) || []).length;
      const close = (next.match(/\)/g) || []).length;
      ch = open > close && /[0-9)%]$/.test(next) ? ')' : '(';
    }
    next += ch;
    setExpr(next);
    setDisplay(next);
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.topIcons}>
          <ClockCounterClockwiseIcon size={22} color="#5F6368" />
          <DotsThreeVerticalIcon size={22} color="#5F6368" weight="bold" />
        </View>
        <View style={styles.displayArea}>
          <Text style={styles.expr} numberOfLines={1}>
            {expr.endsWith('=') || expr === START.expr ? expr : ''}
          </Text>
          <Text style={styles.display} numberOfLines={1} adjustsFontSizeToFit>
            {display}
          </Text>
        </View>
        <View style={styles.sciRow}>
          {['√', 'π', '^', '!'].map((s) => (
            <Text key={s} style={styles.sci}>
              {s}
            </Text>
          ))}
          <CaretDownIcon size={18} color="#5F6368" style={{ marginLeft: 'auto' }} />
        </View>
        <View style={styles.keys}>
          {KEYS.map((k) => {
            const isFn = FUNCTION_KEYS.includes(k);
            const isOp = OPERATORS.includes(k);
            const isEq = k === '=';
            return (
              <Pressable
                key={k}
                onPress={() => press(k)}
                accessibilityRole="button"
                accessibilityLabel={k === '⌫' ? 'Backspace' : k}
                style={({ pressed }) => [
                  styles.key,
                  { width: key, height: key, borderRadius: key / 2 },
                  { backgroundColor: isEq ? '#4A4D52' : isOp ? '#C7CACF' : isFn ? '#D5D7DB' : '#E6E6E6' },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {k === '⌫' ? (
                  <BackspaceIcon size={26} color="#202124" />
                ) : (
                  <Text
                    style={[
                      styles.keyText,
                      isFn && { fontSize: 24, fontWeight: '500' },
                      (isOp || isEq) && { fontSize: 32 },
                      isEq && { color: '#F5F5F5' },
                    ]}
                  >
                    {k}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      {unlocking && (
        <View style={styles.unlock}>
          <StatusBar style="light" />
          <NazarMark size={72} variant="ghost" />
          <Text style={styles.unlockTitle}>You're safe here</Text>
          <Text style={styles.unlockSub}>Opening Nazar…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F7F7' },
  flex: { flex: 1 },
  topIcons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 22, paddingTop: 12, paddingHorizontal: 22 },
  displayArea: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', paddingHorizontal: 28, paddingBottom: 18, gap: 10 },
  expr: { fontSize: 24, color: '#5F6368', minHeight: 30 },
  display: { fontSize: 84, lineHeight: 92, fontWeight: '300', letterSpacing: -0.84, color: '#202124' },
  sciRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 32,
    borderTopWidth: 1,
    borderTopColor: '#E3E3E3',
  },
  sci: { fontSize: 18, color: '#5F6368' },
  keys: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 18,
  },
  key: { alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 30, color: '#202124' },
  unlock: {
    ...StyleSheet.absoluteFill,
    backgroundImage: 'linear-gradient(160deg, #4B3FA0 0%, #2E2670 70%)',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  unlockTitle: { fontFamily: fonts.medium, fontSize: 24, letterSpacing: -0.24, color: colors.onPrimary },
  unlockSub: { fontFamily: fonts.regular, fontSize: 15, color: colors.onPrimary, opacity: 0.8 },
});
