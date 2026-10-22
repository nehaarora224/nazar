import { router } from 'expo-router';
import { ArrowsDownUpIcon, CloudSlashIcon, DeviceMobileIcon, DownloadSimpleIcon, HourglassIcon, MagnifyingGlassIcon, PlusIcon, TrayIcon } from 'phosphor-react-native';
import { ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SheetHead, useOverlay } from '../../components/Overlay';
import { Screen } from '../../components/Screen';
import { Chips, Empty, InfoBox, ListCard, ListRow, MainHeader, PageTitle, Pill, PrimaryButton, Stats, Tabs, TonalButton } from '../../components/ui';
import { KIND_ICON, SOURCE_KEY } from '../../content/evidence';
import { buildTimelineText, downloadTimeline, timelineFilename } from '../../exportVault';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { platformKind } from '../../systemSettings';
import { colors, fonts, radius, space, tone, type } from '../../theme';
import { useView } from '../../view';
import { buildVault, searchVault, SEVERITY_TONE, VaultFilter, VaultItem } from '../../vaultModel';

type View2 = 'timeline' | 'pending';

/**
 * Evidence Vault: one searchable, filterable timeline (newest first) of REAL records — items Nazar
 * auto-collected from events it actually recorded (bait/decoy opens, sends, creation), plus records
 * the person saved or added by hand. No sample/demo data is shown here, so nothing fake is ever
 * presented as evidence. A second tab lists items still awaiting review.
 */
export default function Vault() {
  const { data } = useStore();
  const v = useView();
  const { t, when } = useT();
  const { toast, openSheet, closeSheet } = useOverlay();
  const [tab, setTab] = useState<View2>('timeline');
  const [filter, setFilter] = useState<VaultFilter>('all');
  const [q, setQ] = useState('');
  const [newest, setNewest] = useState(true);
  const web = platformKind === 'web';

  const all = useMemo(() => buildVault(data), [data]);
  const items = useMemo(() => {
    const r = searchVault(all, q, filter);
    return newest ? r : [...r].reverse();
  }, [all, q, filter, newest]);

  const autoCount = all.filter((i) => i.origin === 'auto').length;
  const manualCount = all.filter((i) => i.origin === 'manual').length;
  // Review queue: real (non-sample) events that may matter and haven't been dealt with yet.
  const pending = [...v.pending.filter((p) => !p.sample)].sort((a, b) => (b.at - a.at) * (newest ? 1 : -1));

  // The downloadable file contains only records the person actually saved (data.evidence), never
  // auto-derived or sample entries — so an exported summary can't present example data as genuine.

  return (
    <Screen header={<MainHeader />}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <PageTitle kicker={t('vault.title')} title={t('vault.heading')} sub={t('vault.sub')} />
        </View>
        <Pressable onPress={() => router.navigate('/vault-add')} accessibilityRole="button" accessibilityLabel={t('vault.add')} style={styles.add}>
          <PlusIcon size={22} color={colors.surface} weight="bold" />
        </Pressable>
      </View>

      <Stats
        items={[
          { label: t('vault.status.saved'), value: manualCount, t: manualCount ? 'safe' : undefined },
          { label: t('vault.origin.auto'), value: autoCount, small: true },
          { label: t('vault.status.pending'), value: pending.length, t: pending.length ? 'look' : undefined },
        ]}
      />
      <Meta icon={web ? CloudSlashIcon : DeviceMobileIcon} text={web ? t('vault.chipWeb') : t('vault.chip')} />

      <Tabs<View2>
        value={tab}
        onChange={setTab}
        items={[
          { key: 'timeline', label: t('vault.tab.timeline'), count: all.length },
          { key: 'pending', label: t('vault.status.pending'), count: pending.length },
        ]}
      />

      {tab === 'timeline' ? (
        <>
          <View style={styles.search}>
            <MagnifyingGlassIcon size={18} color={colors.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t('vault.search')}
              placeholderTextColor={colors.muted}
              accessibilityLabel={t('vault.search')}
              autoCorrect={false}
              style={styles.searchInput}
            />
          </View>
          <Chips<VaultFilter>
            value={filter}
            onChange={setFilter}
            items={[
              { key: 'all', label: t('vault.f.all') },
              { key: 'confirmed', label: t('rel.confirmed') },
              { key: 'reported', label: t('rel.reported') },
              { key: 'unverified', label: t('rel.unverified') },
            ]}
          />
          <Pressable onPress={() => setNewest(!newest)} accessibilityRole="button" style={styles.sort}>
            <ArrowsDownUpIcon size={16} color={colors.primary} />
            <Text style={[type.pill, { color: colors.primary }]}>{newest ? t('vault.sort.newest') : t('vault.sort.oldest')}</Text>
          </Pressable>

          {all.length === 0 ? (
            <Empty icon={TrayIcon} title={t('vault.timelineEmpty')} body={t('vault.timelineEmptyBody')} />
          ) : items.length === 0 ? (
            <Empty icon={MagnifyingGlassIcon} title={t('vault.noResults')} />
          ) : (
            <>
              <View style={styles.timeline}>
                {items.map((it, i) => (
                  <TimelineRow key={it.key} item={it} first={i === 0} last={i === items.length - 1} onPress={() => openItem(it)} />
                ))}
              </View>
              <InfoBox body={t('vault.autoNote')} />
            </>
          )}
        </>
      ) : (
        <ListCard title={t('vault.status.pending')} count={pending.length}>
          {pending.length === 0 ? (
            <Empty icon={HourglassIcon} title={t('vault.pendingEmpty')} body={t('vault.pendingEmptyBody')} />
          ) : (
            pending.map((p, i) => (
              <ListRow
                key={p.id}
                first={i === 0}
                icon={KIND_ICON[p.kind]}
                title={p.titleKey ? (p.title ? `${t(p.titleKey)} · ${p.title}` : t(p.titleKey)) : p.title}
                desc={t(SOURCE_KEY[p.kind])}
                meta={when(p.at)}
                onPress={() => router.navigate({ pathname: p.href as '/bait-detail', params: p.params })}
              />
            ))
          )}
        </ListCard>
      )}

      {manualCount > 0 && <DownloadButton onToast={toast} openSheet={openSheet} closeSheet={closeSheet} evidence={data.evidence} />}
    </Screen>
  );
}

function openItem(it: VaultItem) {
  if (it.evidenceId) router.navigate({ pathname: '/evidence', params: { id: it.evidenceId } });
  else if (it.href) router.navigate({ pathname: it.href as '/bait-detail', params: it.hrefParams });
}

/** One timeline entry: title, when · source · category, and severity / relevance / origin pills. */
function TimelineRow({ item, first, last, onPress }: { item: VaultItem; first: boolean; last: boolean; onPress: () => void }) {
  const { t, when } = useT();
  const title = item.titleKey ? (item.subtitle ? `${t(item.titleKey)} · ${item.subtitle}` : t(item.titleKey)) : item.title;
  const meta = [when(item.at), t(item.sourceKey), item.catKey ? t(item.catKey) : ''].filter(Boolean).join(' · ');
  const sevTone = SEVERITY_TONE[item.severity];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.row}>
      <View style={styles.rail}>
        {!first && <View style={styles.lineUp} />}
        <View style={[styles.dot, { backgroundColor: tone[sevTone].dot }]} />
        {!last && <View style={styles.lineDown} />}
      </View>
      <View style={{ flex: 1, paddingBottom: space.md, gap: 5 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>
        <View style={styles.pills}>
          <Pill t={sevTone} label={t(`sev.${item.severity}`)} />
          <Tag label={t(`rel.${item.relevance}`)} />
          <Tag label={item.origin === 'auto' ? t('vault.origin.auto') : t('vault.origin.manual')} muted />
        </View>
      </View>
    </Pressable>
  );
}

/** A small flat label chip (no status dot), used for relevance and origin. */
function Tag({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <View style={[styles.tag, muted && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}>
      <Text style={[type.pill, { color: muted ? colors.muted : colors.primaryDeep }]}>{label}</Text>
    </View>
  );
}

function DownloadButton({
  evidence,
  onToast,
  openSheet,
  closeSheet,
}: {
  evidence: Parameters<typeof buildTimelineText>[0];
  onToast: (s: string) => void;
  openSheet: (n: ReactNode) => void;
  closeSheet: () => void;
}) {
  const { t, when, dur } = useT();
  const run = async () => {
    closeSheet();
    const text = buildTimelineText(evidence, t, when, dur);
    const res = await downloadTimeline(timelineFilename(), text);
    onToast(res === 'failed' ? t('vault.dl.failed') : res === 'downloaded' ? t('vault.dl.ok') : t('vault.dl.saved'));
  };
  // Warn before exporting: the file leaves the encrypted vault as plain text.
  const download = () =>
    openSheet(
      <>
        <SheetHead title={t('vault.dl.warnTitle')} body={t('vault.dl.warnBody')} />
        <PrimaryButton label={t('vault.dl.warnConfirm')} onPress={run} />
        <TonalButton label={t('common.cancel')} onPress={closeSheet} />
      </>,
    );
  return <PrimaryButton icon={DownloadSimpleIcon} label={t('vault.download')} onPress={download} />;
}

function Meta({ icon: I, text }: { icon: typeof DeviceMobileIcon; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
      <I size={16} color={colors.primary} />
      <Text style={[type.body, { flex: 1, fontSize: 14 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 48, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.ink, paddingVertical: 10, outlineColor: colors.primary },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, alignSelf: 'flex-start' },
  timeline: { paddingHorizontal: 4 },
  row: { flexDirection: 'row', gap: 12 },
  rail: { width: 16, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  lineUp: { position: 'absolute', top: 0, height: 4, width: 2, backgroundColor: colors.border },
  lineDown: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  title: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  pills: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.lavenderSoft },
});
