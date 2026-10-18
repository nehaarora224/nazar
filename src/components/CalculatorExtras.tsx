import { ArrowLeftIcon, FolderIcon, LockSimpleIcon, NoteIcon } from 'phosphor-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Bait } from '../store';

/*
 * The calculator's history panel, overflow menu and decoy screens. These are part of the
 * disguise, so they look like a stock calculator (system font, greys) and stay in English
 * like the rest of the calculator. Nothing here ever shows real data: decoys open empty.
 */

const INK = '#202124';
const MUTED = '#5F6368';

export type CalcEntry = { expr: string; result: string };

export function HistoryPanel({
  entries,
  decoys,
  onPick,
  onOpenDecoy,
  onClose,
}: {
  entries: CalcEntry[];
  decoys: Bait[];
  onPick: (e: CalcEntry) => void;
  onOpenDecoy: (b: Bait) => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetBar}>
        <Text style={styles.sheetTitle}>History</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close history" style={styles.iconBtn}>
          <ArrowLeftIcon size={22} color={MUTED} style={{ transform: [{ rotate: '90deg' }] }} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
        {decoys.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => onOpenDecoy(b)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.histRow, pressed && styles.pressed]}
          >
            <View style={styles.saved}>
              <LockSimpleIcon size={14} color={MUTED} />
              <Text style={styles.savedText}>{b.name}</Text>
            </View>
            <Text style={styles.histMeta}>Saved</Text>
          </Pressable>
        ))}
        {[...entries].reverse().map((e, i) => (
          <Pressable
            key={`${e.expr}-${i}`}
            onPress={() => onPick(e)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.histRow, pressed && styles.pressed]}
          >
            <Text style={styles.histExpr}>{e.expr}</Text>
            <Text style={styles.histResult}>{e.result}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function OverflowMenu({
  decoys,
  onHistory,
  onOpenDecoy,
  onClose,
}: {
  decoys: Bait[];
  onHistory: () => void;
  onOpenDecoy: (b: Bait) => void;
  onClose: () => void;
}) {
  const plain = ['Choose theme', 'Privacy policy', 'Send feedback', 'Help'];
  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu">
      <View style={styles.menu}>
        <MenuItem label="History" onPress={onHistory} />
        {decoys.map((b) => (
          <MenuItem key={b.id} label={b.name} onPress={() => onOpenDecoy(b)} />
        ))}
        {plain.map((l) => (
          <MenuItem key={l} label={l} onPress={onClose} />
        ))}
      </View>
    </Pressable>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="menuitem" style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
      <Text style={styles.menuText}>{label}</Text>
    </Pressable>
  );
}

/** What a snooper sees after opening a decoy: an ordinary, empty note or folder. */
export function DecoyView({ bait, onClose }: { bait: Bait; onClose: () => void }) {
  const Icon = bait.type === 'history' ? NoteIcon : FolderIcon;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F7F7F7' }]}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.decoyBar}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Back" style={styles.iconBtn}>
            <ArrowLeftIcon size={22} color={INK} />
          </Pressable>
          <Text style={styles.decoyTitle} numberOfLines={1}>
            {bait.name}
          </Text>
        </View>
        <View style={styles.decoyBody}>
          <Icon size={56} color="#B0B3B8" />
          <Text style={styles.decoyEmpty}>{bait.type === 'history' ? 'Nothing saved yet' : 'This folder is empty'}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '58%',
    backgroundColor: '#F7F7F7',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    boxShadow: '0px 8px 24px rgba(0,0,0,0.18)',
  },
  sheetBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  sheetTitle: { fontSize: 20, color: INK },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  histRow: { paddingHorizontal: 24, paddingVertical: 12, alignItems: 'flex-end', gap: 2 },
  histExpr: { fontSize: 18, color: MUTED },
  histResult: { fontSize: 26, color: INK },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savedText: { fontSize: 18, color: INK },
  histMeta: { fontSize: 13, color: MUTED },
  pressed: { backgroundColor: '#E8E8E8' },
  menu: {
    position: 'absolute',
    top: 44,
    right: 12,
    minWidth: 200,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 4px 16px rgba(0,0,0,0.2)',
  },
  menuItem: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  menuText: { fontSize: 16, color: INK },
  decoyBar: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  decoyTitle: { flex: 1, fontSize: 20, color: INK },
  decoyBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  decoyEmpty: { fontSize: 16, color: MUTED },
});
