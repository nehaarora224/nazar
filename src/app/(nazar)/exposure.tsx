import { Href, router } from 'expo-router';
import { CaretRightIcon, ChatCircleIcon, CheckIcon, FootprintsIcon, Icon, ImageIcon, MapPinIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { BackButton, card, IconChip } from '../../components/ui';
import { colors, tone, Tone, type } from '../../theme';

type Exposure = { name: string; line: string; t: Tone; icon: Icon; href?: Href };

/** Ordered by what matters most. */
const ITEMS: Exposure[] = [
  { name: 'Movement', line: 'Where you go may be followed', t: 'act', icon: FootprintsIcon, href: '/tracker' },
  { name: 'Location', line: 'Your location may be visible to 1 person', t: 'look', icon: MapPinIcon, href: '/tracker' },
  { name: 'Messages', line: 'Your messages look private', t: 'safe', icon: ChatCircleIcon },
  { name: 'Photos', line: 'Your photos stay on this phone', t: 'safe', icon: ImageIcon },
];

/** Screen 03 — What can they see? */
export default function ExposureScreen() {
  return (
    <Screen
      gap={18}
      padTop={8}
      header={
        <>
          <BackButton />
          <Text style={[type.label, { fontSize: 15, color: colors.muted }]}>Exposure</Text>
        </>
      }
    >
      <View style={{ gap: 8 }}>
        <Text style={type.display}>What can they see?</Text>
        <Text style={type.body}>
          Here is what someone else might be able to see on this phone — and what is still only yours.
        </Text>
      </View>

      <View style={styles.strip}>
        {ITEMS.map(({ name, t, icon: I }) => (
          <View key={name} style={[styles.chip, { backgroundColor: tone[t].bg }]}>
            <I size={19} weight="fill" color={tone[t].dot} />
            <Text style={[type.pill, { color: tone[t].fg }]}>{name}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <Text style={type.overline}>Most important first</Text>
        {ITEMS.map((item) => (
          <ExposureRow key={item.name} {...item} />
        ))}
      </View>
    </Screen>
  );
}

function ExposureRow({ name, line, t, icon, href }: Exposure) {
  const risky = t !== 'safe';
  const c = tone[t];
  return (
    <Pressable
      disabled={!href}
      onPress={() => href && router.navigate(href)}
      accessibilityRole={href ? 'button' : undefined}
      accessibilityLabel={`${name}. ${line}`}
      style={({ pressed }) => [
        styles.row,
        risky
          ? { backgroundImage: `linear-gradient(100deg, ${c.bg} 0%, ${colors.surface} 75%)`, boxShadow: `0px 10px 22px -18px ${c.fg}` }
          : { boxShadow: 'none' },
        pressed && { opacity: 0.85 },
      ]}
    >
      <IconChip
        icon={icon}
        size={44}
        radius={14}
        iconSize={21}
        bg={risky ? c.dot : colors.safeBg}
        fg={risky ? colors.surface : colors.safeIcon}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.label}>{name}</Text>
        <Text style={type.body}>{line}</Text>
      </View>
      {risky ? (
        <CaretRightIcon size={16} weight="bold" color={c.fg} />
      ) : (
        <CheckIcon size={16} weight="bold" color={colors.safeIcon} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, alignItems: 'center', gap: 5, paddingTop: 10, paddingBottom: 9, borderRadius: 14 },
  row: { ...card, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 16 },
});
