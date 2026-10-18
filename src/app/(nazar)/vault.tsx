import { router } from 'expo-router';
import {
  BluetoothIcon,
  CloudSlashIcon,
  DeviceMobileIcon,
  FileLockIcon,
  Icon,
  LockSimpleIcon,
  PulseIcon,
  ShareNetworkIcon,
  UserCircleIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { card, ConfirmButton, IconChip, InfoBox, MainHeader, PrimaryButton } from '../../components/ui';
import { checkKey } from '../../content/accountChecks';
import { TKey, useT } from '../../i18n';
import { Evidence, useStore } from '../../store';
import { platformKind } from '../../systemSettings';
import { colors, fonts, radius, space, type } from '../../theme';

type Kind = Evidence['kind'];
const FILTERS: { label: TKey; kind?: Kind }[] = [
  { label: 'vault.f.all' },
  { label: 'vault.f.bait', kind: 'bait' },
  { label: 'vault.f.tracker', kind: 'tracker' },
  { label: 'vault.f.account', kind: 'account' },
  { label: 'vault.f.quiet', kind: 'quiet' },
];
const KIND_ICON: Record<Kind, Icon> = { bait: FileLockIcon, tracker: BluetoothIcon, account: UserCircleIcon, quiet: PulseIcon };

/** Evidence Vault: only what she chose to save, kept on this device. */
export default function Vault() {
  const { data } = useStore();
  const { t, tn, when, dur } = useT();
  const [filter, setFilter] = useState(0);
  const [shareFailed, setShareFailed] = useState(false);
  const web = platformKind === 'web';

  const kind = FILTERS[filter].kind;
  const items = [...data.evidence].filter((e) => !kind || e.kind === kind).sort((a, b) => b.eventAt - a.eventAt);
  const lastSaved = data.evidence.reduce((m, e) => Math.max(m, e.savedAt), 0);

  const title = (e: Evidence) =>
    e.kind === 'bait'
      ? t('vault.row.bait', { name: e.baitName })
      : e.kind === 'tracker'
        ? t(`trk.cls.${e.result}` as TKey)
        : e.kind === 'account'
          ? t(checkKey(e.checkId, 'title'))
          : t('vault.row.quiet', { area: t(`quiet.${e.area}` as TKey) });
  const detail = (e: Evidence) => {
    if (e.kind === 'bait') return [t(`bait.type.${e.baitType}`), e.durationMs ? t('bd.openFor', { d: dur(e.durationMs) }) : t('bd.noDur')];
    if (e.kind === 'tracker') return [e.trackerType ? t(`trk.type.${e.trackerType}` as TKey) : '', e.note ? `“${e.note}”` : ''].filter(Boolean);
    return e.note ? [`“${e.note}”`] : [];
  };

  const share = async () => {
    const all = [...data.evidence].sort((a, b) => a.eventAt - b.eventAt);
    const lines = [
      t('vault.report.title'),
      t('vault.report.created', { when: when(Date.now()) }),
      '',
      ...all.flatMap((e, i) => [`${i + 1}. ${title(e)}`, `   ${t('vault.happened', { when: when(e.eventAt) })}`, ...detail(e).map((d) => `   ${d}`), '']),
    ];
    try {
      await Share.share({ message: lines.join('\n'), title: t('vault.report.title') });
      setShareFailed(false);
    } catch {
      setShareFailed(true);
    }
  };

  return (
    <Screen header={<MainHeader />} gap={space.sm}>
      <View style={styles.titleRow}>
        <IconChip icon={LockSimpleIcon} size={40} radius={14} weight="fill" bg={colors.primary} fg={colors.onPrimary} />
        <Text style={styles.title} accessibilityRole="header">
          {t('vault.title')}
        </Text>
      </View>
      <View style={styles.reassure}>
        <LockSimpleIcon size={14} weight="fill" color={colors.safeFg} />
        <Text style={[type.pill, { color: colors.safeFg }]}>{web ? t('vault.chipWeb') : t('vault.chip')}</Text>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={styles.heading}>{t('vault.heading')}</Text>
        <Text style={type.body}>{t('vault.sub')}</Text>
      </View>

      <View style={styles.summary}>
        <Text style={type.label}>
          {tn('vault.count', data.evidence.length)}
          {lastSaved ? ` · ${t('vault.lastAdded', { when: when(lastSaved) })}` : ''}
        </Text>
        <Meta icon={DeviceMobileIcon} text={web ? t('vault.chipWeb') : t('vault.chip')} />
        <Meta icon={CloudSlashIcon} text={web ? t('vault.backupWeb') : t('vault.backup')} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersInner}>
        {FILTERS.map((f, i) => {
          const on = i === filter;
          return (
            <Pressable
              key={f.label}
              onPress={() => setFilter(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
            >
              <Text style={[type.pill, { color: on ? colors.onPrimary : colors.primaryDeep }]}>{t(f.label)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={type.title}>{t('vault.empty.title')}</Text>
          <Text style={[type.body, { textAlign: 'center' }]}>{t('vault.empty.body')}</Text>
        </View>
      ) : (
        items.map((e) => <Row key={e.id} e={e} title={title(e)} detail={detail(e)} />)
      )}

      {data.evidence.length > 0 && (
        <View style={{ gap: 4, marginTop: space.sm }}>
          <PrimaryButton icon={ShareNetworkIcon} label={t('vault.share')} onPress={share} />
          <Text style={[type.body, { textAlign: 'center' }]}>{t('vault.shareSub')}</Text>
          {shareFailed && <InfoBox kind="warn" body={t('vault.shareFail')} />}
        </View>
      )}
    </Screen>
  );
}

function Row({ e, title, detail }: { e: Evidence; title: string; detail: string[] }) {
  const { removeEvidence } = useStore();
  const { t, when } = useT();
  const [open, setOpen] = useState(false);
  const source = () => {
    if (e.kind === 'bait') router.navigate('/bait');
    else if (e.kind === 'tracker') router.navigate({ pathname: '/tracker-detail', params: { id: e.refId } });
    else if (e.kind === 'account') router.navigate({ pathname: '/account-item', params: { id: e.checkId } });
    else router.navigate('/quiet-check');
  };
  return (
    <View style={styles.row}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.rowMain}>
        <IconChip icon={KIND_ICON[e.kind]} size={34} iconSize={18} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[type.label, { fontSize: 15 }]}>{title}</Text>
          <Text style={[type.body, { fontSize: 14 }]}>{t('vault.happened', { when: when(e.eventAt) })}</Text>
          {detail.map((d) => (
            <Text key={d} style={[type.body, { fontSize: 14 }]}>
              {d}
            </Text>
          ))}
        </View>
      </Pressable>
      {open && (
        <View style={{ gap: space.sm }}>
          <Pressable onPress={source} accessibilityRole="link" style={styles.link}>
            <Text style={[type.pill, { color: colors.primary }]}>{t('bait.inspect')}</Text>
          </Pressable>
          <ConfirmButton label={t('vault.remove')} confirmLabel={t('vault.removeConfirm')} onConfirm={() => removeEvidence(e.id)} />
        </View>
      )}
    </View>
  );
}

function Meta({ icon: I, text }: { icon: Icon; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <I size={17} color={colors.primary} />
      <Text style={[type.body, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.2, color: colors.ink },
  reassure: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    backgroundColor: colors.safeBg,
  },
  heading: { fontFamily: fonts.medium, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: colors.ink },
  summary: { ...card, gap: 6, paddingVertical: 12, paddingHorizontal: 14, boxShadow: 'none' },
  filters: { marginRight: -18, flexGrow: 0 },
  filtersInner: { gap: 6, paddingRight: 18 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary },
  chipOff: { backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(75,63,160,0.18)' },
  empty: { alignItems: 'center', gap: space.sm, padding: space.xl, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  row: { ...card, borderRadius: radius.md, padding: 12, gap: space.sm, boxShadow: 'none' },
  rowMain: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  link: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 },
});
