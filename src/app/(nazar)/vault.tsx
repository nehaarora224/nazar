import { router } from 'expo-router';
import { ArrowsDownUpIcon, CloudSlashIcon, DeviceMobileIcon, DownloadSimpleIcon, HourglassIcon, PlusIcon, TrayIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useOverlay } from '../../components/Overlay';
import { Screen } from '../../components/Screen';
import { Chips, Empty, ListCard, ListRow, MainHeader, PageTitle, PrimaryButton, Stats, Tabs } from '../../components/ui';
import { evidenceDetail, evidenceTitle, KIND_ICON, SOURCE_KEY } from '../../content/evidence';
import { buildTimelineText, downloadTimeline, timelineFilename } from '../../exportVault';
import { useT } from '../../i18n';
import { Evidence } from '../../store';
import { platformKind } from '../../systemSettings';
import { colors, fonts, space, type } from '../../theme';
import { useView } from '../../view';

type View2 = 'saved' | 'pending';
type Cat = 'all' | 'bait' | 'tracker' | 'account' | 'audit';

const catOfKind = (kind: Evidence['kind']): Cat =>
  kind === 'bait' || kind === 'link' ? 'bait' : kind === 'tracker' || kind === 'ble' ? 'tracker' : kind === 'account' ? 'account' : kind === 'audit' || kind === 'quiet' ? 'audit' : 'all';

/** Which filter chip a saved record belongs to (manual notes route by their chosen category). */
const catOf = (e: Evidence): Cat => {
  if (e.kind !== 'note') return catOfKind(e.kind);
  return e.category === 'bait' || e.category === 'tracker' || e.category === 'account' || e.category === 'audit' ? e.category : 'all';
};

/** Evidence Vault: a timeline of saved records, with manual entry and a downloadable export. */
export default function Vault() {
  const v = useView();
  const { t, when, dur } = useT();
  const { toast } = useOverlay();
  const [tab, setTab] = useState<View2>('saved');
  const [cat, setCat] = useState<Cat>('all');
  const [newest, setNewest] = useState(true);
  const web = platformKind === 'web';

  const saved = [...v.evidence.filter((e) => cat === 'all' || catOf(e) === cat)].sort((a, b) => (b.eventAt - a.eventAt) * (newest ? 1 : -1));
  const pending = [...v.pending.filter((p) => cat === 'all' || catOfKind(p.kind) === cat)].sort((a, b) => (b.at - a.at) * (newest ? 1 : -1));
  const lastSaved = v.evidence.reduce((m, e) => Math.max(m, e.savedAt), 0);

  // The downloadable evidence file contains only records the person actually saved — never the
  // seed/example entries — so an exported summary can't present example data as genuine evidence.
  const realEvidence = v.evidence.filter((e) => !e.sample);
  const download = async () => {
    if (realEvidence.length === 0) {
      toast(t('vault.dl.none'));
      return;
    }
    const text = buildTimelineText(realEvidence, t, when, dur);
    const res = await downloadTimeline(timelineFilename(), text);
    toast(res === 'failed' ? t('vault.dl.failed') : res === 'downloaded' ? t('vault.dl.ok') : t('vault.dl.saved'));
  };

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
          { label: t('vault.status.saved'), value: v.evidence.length, t: 'safe' },
          { label: t('vault.status.pending'), value: v.pending.length, t: v.pending.length ? 'look' : undefined },
          { label: t('vault.lastAddedLabel'), value: lastSaved ? when(lastSaved) : '—', small: true },
        ]}
      />
      <Meta icon={web ? CloudSlashIcon : DeviceMobileIcon} text={web ? t('vault.chipWeb') : t('vault.chip')} />

      <Tabs<View2>
        value={tab}
        onChange={setTab}
        items={[
          { key: 'saved', label: t('vault.status.saved'), count: v.evidence.length },
          { key: 'pending', label: t('vault.status.pending'), count: v.pending.length },
        ]}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Chips<Cat>
          value={cat}
          onChange={setCat}
          items={[
            { key: 'all', label: t('vault.f.all') },
            { key: 'bait', label: t('vault.f.bait') },
            { key: 'tracker', label: t('vault.f.tracker') },
            { key: 'account', label: t('vault.f.account') },
            { key: 'audit', label: t('vault.f.audit') },
          ]}
        />
      </View>
      <Pressable onPress={() => setNewest(!newest)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, alignSelf: 'flex-start' }}>
        <ArrowsDownUpIcon size={16} color={colors.primary} />
        <Text style={[type.pill, { color: colors.primary }]}>{newest ? t('vault.sort.newest') : t('vault.sort.oldest')}</Text>
      </Pressable>

      {tab === 'saved' ? (
        saved.length === 0 ? (
          <Empty icon={TrayIcon} title={t('vault.empty.title')} body={t('vault.empty.body')} />
        ) : (
          <View style={styles.timeline}>
            {saved.map((e, i) => (
              <TimelineRow
                key={e.id}
                first={i === 0}
                last={i === saved.length - 1}
                tone={colors.safe}
                title={evidenceTitle(e, t)}
                meta={t('vault.happened', { when: when(e.eventAt) })}
                desc={[t(SOURCE_KEY[e.kind]), ...evidenceDetail(e, t, dur)].join(' · ')}
                onPress={() => router.navigate({ pathname: '/evidence', params: { id: e.id } })}
              />
            ))}
          </View>
        )
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

      {v.evidence.length > 0 && (
        <PrimaryButton icon={DownloadSimpleIcon} label={t('vault.download')} onPress={download} />
      )}
    </Screen>
  );
}

function TimelineRow({ first, last, tone, title, meta, desc, onPress }: { first: boolean; last: boolean; tone: string; title: string; meta: string; desc?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.row}>
      <View style={styles.rail}>
        {!first && <View style={styles.lineUp} />}
        <View style={[styles.dot, { backgroundColor: tone }]} />
        {!last && <View style={styles.lineDown} />}
      </View>
      <View style={{ flex: 1, paddingBottom: space.md, gap: 2 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>
        {desc ? <Text style={[type.body, { fontSize: 13 }]}>{desc}</Text> : null}
      </View>
    </Pressable>
  );
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
  timeline: { paddingHorizontal: 4 },
  row: { flexDirection: 'row', gap: 12 },
  rail: { width: 16, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  lineUp: { position: 'absolute', top: 0, height: 4, width: 2, backgroundColor: colors.border },
  lineDown: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  title: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
