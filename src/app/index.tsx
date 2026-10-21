import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BackspaceIcon, CaretDownIcon, ClockCounterClockwiseIcon, DotsThreeVerticalIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { evaluate, formatResult } from '../calc';
import { CalcEntry, DecoyView, HistoryPanel, OverflowMenu } from '../components/CalculatorExtras';
import { useScreenSize } from '../components/DeviceFrame';
import { NazarMark } from '../components/Logo';
import { PinSetup } from '../components/PinSetup';
import { useT } from '../i18n';
import { session } from '../session';
import { Bait, useStore } from '../store';
import { colors, fonts } from '../theme';

/**
 * The open code: a fixed, non-secret gesture that reveals Nazar's PIN setup on first run. It is NOT
 * the security boundary — the saved data is encrypted under the user's own PIN (see store.tsx and
 * crypto/vaultCrypto.ts). Once a PIN exists, unlocking is done by typing THAT PIN and pressing =;
 * a wrong PIN (or this code) just behaves like any other calculation, keeping the disguise intact.
 */
const OPEN_CODE = '1947';
const PIN_RE = /^\d{4,12}$/;
// Start blank, like a freshly opened calculator.
const START = { expr: '', display: '0' };
const START_HISTORY: CalcEntry[] = [];

type Panel = { kind: 'none' } | { kind: 'history' } | { kind: 'menu' } | { kind: 'decoy'; bait: Bait; eventId: string; openedAt: number };

const KEYS = ['AC', '( )', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '⌫', '='];
const KEY_ROWS = [0, 4, 8, 12, 16].map((i) => KEYS.slice(i, i + 4));
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
  const [history, setHistory] = useState<CalcEntry[]>(START_HISTORY);
  const [panel, setPanel] = useState<Panel>({ kind: 'none' });
  const [showCreate, setShowCreate] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { recordBaitOpen, finishBaitOpen, status, decoys, unlock, lock } = useStore();
  const { t } = useT();
  // Decoys come from the plaintext decoy index, so they run even while the vault is locked.
  const activeBaits = (type: Bait['type']) => decoys.filter((b) => b.active && b.type === type);
  const { width, height } = useScreenSize();
  // On shorter screens, shrink the five key rows so the display keeps its room (~370 for everything else).
  const key = Math.min(80, Math.floor((width - 32 - 36) / 4), Math.floor((height - 370) / 5));

  // Whenever we land back here (Quick exit, app resumed), look untouched.
  useFocusEffect(
    useCallback(() => {
      setExpr(START.expr);
      setDisplay(START.display);
      setUnlocking(false);
      setHistory(START_HISTORY);
      setPanel({ kind: 'none' });
      setShowCreate(false);
      // Back on the calculator means locked again: drop the navigation flag AND clear the key and
      // decrypted data from memory, so returning requires the PIN.
      session.lock();
      lock();
    }, [lock]),
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  /** A decoy was really opened: record it now, and its duration when it closes. */
  const openDecoy = (bait: Bait) => setPanel({ kind: 'decoy', bait, eventId: recordBaitOpen(bait.id), openedAt: Date.now() });
  const closePanel = useCallback(() => {
    setPanel((p) => {
      if (p.kind === 'decoy') finishBaitOpen(p.eventId, Date.now() - p.openedAt);
      return { kind: 'none' };
    });
  }, [finishBaitOpen]);

  // Close (and time) an open decoy if the app is backgrounded; Android back closes panels.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st !== 'active' && closePanel());
    return () => sub.remove();
  }, [closePanel]);
  useEffect(() => {
    if (panel.kind === 'none') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closePanel();
      return true;
    });
    return () => sub.remove();
  }, [panel.kind, closePanel]);

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
      const s = expr.replace(/\s/g, '');
      // First run: the open code reveals PIN setup. After a PIN exists it is just a number.
      if (status === 'setup' && s === OPEN_CODE) {
        setShowCreate(true);
        return;
      }
      // A plausible PIN (4–12 digits): try to unlock. A wrong PIN or an active lockout silently
      // falls back to showing the result of the "calculation", so the disguise never breaks.
      if ((status === 'locked' || status === 'ready') && PIN_RE.test(s)) {
        unlock(s).then((res) => {
          if (res.ok) {
            setUnlocking(true);
            session.unlock();
            clearTimeout(timer.current);
            timer.current = setTimeout(() => router.push('/home'), 900);
          } else {
            const v = evaluate(s);
            const result = v == null ? 'Error' : formatResult(v);
            setExpr(s + ' =');
            setDisplay(result);
            if (v != null) setHistory((h) => [...h.slice(-49), { expr: s, result }]);
          }
        });
        return;
      }
      const v = evaluate(expr);
      const result = v == null ? 'Error' : formatResult(v);
      setExpr(expr + ' =');
      setDisplay(result);
      if (v != null && !fresh) setHistory((h) => [...h.slice(-49), { expr, result }]);
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
          <Pressable onPress={() => setPanel({ kind: 'history' })} accessibilityRole="button" accessibilityLabel="History" style={styles.topBtn}>
            <ClockCounterClockwiseIcon size={22} color="#5F6368" />
          </Pressable>
          <Pressable onPress={() => setPanel({ kind: 'menu' })} accessibilityRole="button" accessibilityLabel="More options" style={styles.topBtn}>
            <DotsThreeVerticalIcon size={22} color="#5F6368" weight="bold" />
          </Pressable>
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
          {KEY_ROWS.map((row) => (
            <View key={row[0]} style={styles.keyRow}>
              {row.map((k) => {
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
          ))}
        </View>
      </SafeAreaView>

      {panel.kind === 'history' && (
        <SafeAreaView edges={['top']} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={closePanel} accessibilityLabel="Close history" />
          <HistoryPanel
            entries={history}
            decoys={activeBaits('history')}
            onPick={(e) => {
              setExpr(e.expr);
              setDisplay(e.expr);
              closePanel();
            }}
            onOpenDecoy={openDecoy}
            onClose={closePanel}
          />
        </SafeAreaView>
      )}
      {panel.kind === 'menu' && (
        <SafeAreaView edges={['top']} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <OverflowMenu decoys={activeBaits('menu')} onHistory={() => setPanel({ kind: 'history' })} onOpenDecoy={openDecoy} onClose={closePanel} />
        </SafeAreaView>
      )}
      {panel.kind === 'decoy' && <DecoyView bait={panel.bait} onClose={closePanel} />}

      {showCreate && (
        <PinSetup
          onDone={() => {
            setShowCreate(false);
            setUnlocking(true);
            session.unlock();
            clearTimeout(timer.current);
            timer.current = setTimeout(() => router.push('/home'), 900);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {unlocking && (
        <View style={styles.unlock}>
          <StatusBar style="light" />
          <NazarMark size={72} variant="ghost" />
          <Text style={styles.unlockTitle}>{t('unlock.title')}</Text>
          <Text style={styles.unlockSub}>{t('unlock.sub')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F7F7' },
  flex: { flex: 1 },
  topIcons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 0, paddingTop: 2, paddingHorizontal: 10 },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
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
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 18,
  },
  keyRow: { flexDirection: 'row', justifyContent: 'space-between' },
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
