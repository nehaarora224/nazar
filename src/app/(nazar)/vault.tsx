import { router } from 'expo-router';
import { ArrowsDownUpIcon, CloudSlashIcon, DeviceMobileIcon, HourglassIcon, LockSimpleIcon, ShareNetworkIcon, TrayIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Chips, Empty, InfoBox, ListCard, ListRow, MainHeader, PageTitle, PrimaryButton, SampleBanner, Stats, StatusLine, Tabs } from '../../components/ui';
import { evidenceDetail, evidenceTitle, KIND_ICON, SOURCE_KEY } from '../../content/evidence';
import { useT } from '../../i18n';
import { Evidence } from '../../store';
import { platformKind } from '../../systemSettings';
import { colors, type } from '../../theme';
import { useView } from '../../view';

type View2 = 'saved' | 'pending';
type Cat = 'all' | 'bait' | 'tracker' | 'account' | 'audit';
const inCat = (cat: Cat, kind: Evidence['kind']) =>
  cat === 'all' ||
  (cat === 'bait' ? kind === 'bait' || kind === 'link' : cat === 'tracker' ? kind === 'tracker' || kind === 'ble' : cat === 'audit' ? kind === 'audit' || kind === 'quiet' : kind === cat);

/** Evidence Vault: saved records and items still pending her review. */
export default function Vault() {
  const v = useView();
  const { t, tn, when, dur } = useT();
  const [tab, setTab] = useState<View2>('saved');
  const [cat, setCat] = useState<Cat>('all');
  const [newest, setNewest] = useState(true);
  const [shareFailed, setShareFailed] = useState(false);
  const web = platformKind === 'web';

  const order = <T extends { at?: number; eventAt?: number }>(list: T[]) =>
    [...list].sort((a, b) => ((b.eventAt ?? b.at ?? 0) - (a.eventAt ?? a.at ?? 0)) * (newest ? 1 : -1));
  const saved = order(v.evidence.filter((e) => inCat(cat, e.kind)));
  const pending = order(v.pending.filter((p) => inCat(cat, p.kind)));
  const real = v.evidence.filter((e) => !e.sample);
  const lastSaved = v.evidence.reduce((m, e) => Math.max(m, e.savedAt), 0);

  const share = async () => {
    const all = [...real].sort((a, b) => a.eventAt - b.eventAt);
    const lines = [
      t('vault.report.title'),
      t('vault.report.created', { when: when(Date.now()) }),
      '',
      ...all.flatMap((e, i) => [
        `${i + 1}. ${evidenceTitle(e, t)}`,
        `   ${t('vault.happened', { when: when(e.eventAt) })}`,
        `   ${t('ev.source')}: ${t(SOURCE_KEY[e.kind])}`,
        ...evidenceDetail(e, t, dur).map((d) => `   ${d}`),
        ...(e.reviewNote ? [`   ${t('vault.report.note', { note: e.reviewNote })}`] : []),
        '',
      ]),
    ];
    try {
      await Share.share({ message: lines.join('\n'), title: t('vault.report.title') });
      setShareFailed(false);
    } catch {
      setShareFailed(true);
    }
  };

  return (
    <Screen header={<MainHeader />}>
      <PageTitle kicker={t('vault.title')} title={t('vault.heading')} sub={t('vault.sub')} />
      <SampleBanner />

      <View style={{ gap: 6 }}>
        <Stats
          items={[
            { label: t('vault.status.saved'), value: v.evidence.length, t: 'safe' },
            { label: t('vault.status.pending'), value: v.pending.length, t: v.pending.length ? 'look' : undefined },
            { label: t('vault.lastAddedLabel'), value: lastSaved ? when(lastSaved) : '—', small: true },
          ]}
        />
        <Meta icon={DeviceMobileIcon} text={web ? t('vault.chipWeb') : t('vault.chip')} />
        <Meta icon={CloudSlashIcon} text={web ? t('vault.backupWeb') : t('vault.backup')} />
      </View>

      <Tabs<View2>
        value={tab}
        onChange={setTab}
        items={[
          { key: 'saved', label: t('vault.status.saved'), count: v.evidence.length },
          { key: 'pending', label: t('vault.status.pending'), count: v.pending.length },
        ]}
      />
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
      <Pressable onPress={() => setNewest(!newest)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, alignSelf: 'flex-start' }}>
        <ArrowsDownUpIcon size={16} color={colors.primary} />
        <Text style={[type.pill, { color: colors.primary }]}>{newest ? t('vault.sort.newest') : t('vault.sort.oldest')}</Text>
      </Pressable>

      {tab === 'saved' ? (
        <ListCard title={t('vault.status.saved')} count={saved.length}>
          {saved.length === 0 ? (
            <Empty icon={TrayIcon} title={t('vault.empty.title')} body={t('vault.empty.body')} />
          ) : (
            saved.map((e, i) => (
              <ListRow
                key={e.id}
                first={i === 0}
                icon={KIND_ICON[e.kind]}
                title={evidenceTitle(e, t)}
                status={<StatusLine t="safe" label={t('vault.status.saved')} sample={e.sample} />}
                desc={[t(SOURCE_KEY[e.kind]), ...evidenceDetail(e, t, dur)].join(' · ')}
                meta={t('vault.happened', { when: when(e.eventAt) })}
                onPress={() => router.navigate({ pathname: '/evidence', params: { id: e.id } })}
              />
            ))
          )}
        </ListCard>
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
                status={<StatusLine t="look" label={t('vault.status.pending')} sample={p.sample} />}
                desc={`${t(SOURCE_KEY[p.kind])} · ${t('vault.pendingHint')}`}
                meta={when(p.at)}
                onPress={() => router.navigate({ pathname: p.href as '/bait-detail', params: p.params })}
              />
            ))
          )}
        </ListCard>
      )}

      {real.length > 0 && (
        <View style={{ gap: 6 }}>
          <PrimaryButton icon={ShareNetworkIcon} label={t('vault.share')} onPress={share} />
          <Text style={[type.body, { textAlign: 'center' }]}>{t('vault.shareSub')}</Text>
          {shareFailed && <InfoBox kind="warn" body={t('vault.shareFail')} />}
        </View>
      )}
      {real.length === 0 && v.evidence.length > 0 && <InfoBox body={t('vault.shareSampleNote')} />}
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
        <LockSimpleIcon size={14} color={colors.muted} />
        <Text style={[type.body, { fontSize: 13 }]}>{tn('vault.count', real.length)}</Text>
      </View>
    </Screen>
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

