import { router, useFocusEffect } from 'expo-router';
import { EnvelopeSimpleIcon, FishSimpleIcon, PlusIcon } from 'phosphor-react-native';
import { useCallback } from 'react';
import { Text, View } from 'react-native';

import { reviewKey, SEND_TONE, sendLabel, useReviewEvent } from '../../components/BaitParts';
import { Screen } from '../../components/Screen';
import { Empty, InfoBox, ListCard, ListRow, PageTitle, PrimaryButton, SampleBadge, SampleBanner, SecondaryButton, Stats, StatusLine, SubHeader } from '../../components/ui';
import { baitServiceConfigured, fetchLinkEvents } from '../../baitService';
import { BAIT_ICON } from '../../content/baits';
import { tplKey } from '../../content/templates';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { colors, space, type } from '../../theme';
import { baitSummary, BaitView, counts, useView } from '../../view';

/** Bait Test: email baits and calculator decoys, their real activity, and labelled samples. */
export default function BaitTest() {
  const { data, status, mergeLinkEvents } = useStore();
  const v = useView();
  const { t, when } = useT();
  const s = baitSummary(v);
  const unknown = status !== 'ready';
  const email = v.baits.filter((b) => b.kind === 'email');
  const decoys = v.baits.filter((b) => b.kind === 'decoy');
  const review = useReviewEvent();
  const toReview = v.events.filter((e) => !e.review || e.review === 'unsure').sort((a, b) => b.at - a.at);

  // Pull link events for sent baits whenever this page opens (only if a service is configured).
  useFocusEffect(
    useCallback(() => {
      if (!baitServiceConfigured) return;
      data.emailBaits
        .filter((b) => b.remoteId && b.send.status === 'sent')
        .forEach((b) => fetchLinkEvents(b.remoteId!).then((list) => list && mergeLinkEvents(b.id, list)));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.emailBaits.length]),
  );

  const row = (b: BaitView, i: number) => {
    const ev = v.events.filter((e) => e.baitId === b.id);
    const counted = ev.filter(counts);
    const latest = counted.reduce<number | undefined>((m, e) => (m === undefined || e.at > m ? e.at : m), undefined);
    const typeLabel = b.kind === 'email' ? t(tplKey(b.template!, 'name')) : t(`bait.type.${b.decoyType!}`);
    const statusTone = !b.active ? 'off' : b.kind === 'email' ? SEND_TONE[b.send?.status ?? 'not_sent'] : 'safe';
    // Email baits show their real send state; only a sent one is live.
    const statusLabel = !b.active ? t('bait.status.inactive') : b.kind === 'email' ? sendLabel(b, t, when) : t('bait.status.active');
    return (
      <ListRow
        key={b.id}
        first={i === 0}
        icon={b.kind === 'email' ? EnvelopeSimpleIcon : BAIT_ICON[b.decoyType!]}
        title={b.name}
        status={<StatusLine t={statusTone} label={statusLabel} sample={b.sample} />}
        desc={`${typeLabel} · ${t('bait.created', { when: when(b.createdAt) })}`}
        meta={latest ? t('bait.latest', { when: when(latest) }) : b.kind === 'email' ? t('bait.noLinkEvents') : t('bait.latestNone')}
        onPress={() => router.navigate({ pathname: '/bait-detail', params: { id: b.id } })}
      />
    );
  };

  return (
    <Screen header={<SubHeader title={t('bait.title')} />}>
      <PageTitle title={t('bait.title')} sub={t('bait.intro')} />
      <SampleBanner />
      <Stats
        items={[
          { label: t('baitW.activeBaits'), value: unknown ? '—' : s.active.length },
          { label: t('baitW.openedToday'), value: unknown ? '—' : s.today.length, t: s.today.length ? 'act' : undefined },
          { label: t('bait.toReview'), value: unknown ? '—' : toReview.length, t: toReview.length ? 'look' : undefined },
        ]}
      />
      {!baitServiceConfigured && <InfoBox kind="warn" title={t('bait.serviceOffTitle')} body={t('bait.serviceOff')} />}

      {toReview.length > 0 && (
        <ListCard title={t('bait.reviewList')} count={toReview.length}>
          {toReview.slice(0, 3).map((e, i) => {
            const b = v.baitOf(e.baitId);
            return (
              <ListRow
                key={e.id}
                first={i === 0}
                icon={FishSimpleIcon}
                iconBg={colors.statAlert}
                iconFg={colors.actFg}
                title={t(e.kind === 'link' ? 'tl.opened' : 'tl.openedDecoy')}
                status={<StatusLine t="look" label={t(reviewKey(e))} sample={e.sample} />}
                desc={`“${b?.name ?? ''}”${e.detail ? ` · ${e.detail}` : ''}`}
                meta={when(e.at)}
                action={<SecondaryButton label={t('bd.review')} onPress={() => review(e)} style={{ minHeight: 40 }} />}
              />
            );
          })}
        </ListCard>
      )}

      {v.baits.length === 0 ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: 22 }}>
          <Empty
            icon={FishSimpleIcon}
            title={t('bait.empty.title')}
            body={t('baitW.empty')}
            action={<PrimaryButton icon={PlusIcon} label={t('baitW.createFirst')} onPress={() => router.navigate('/bait-new')} style={{ alignSelf: 'stretch' }} />}
          />
        </View>
      ) : (
        <>
          <ListCard title={t('bait.emailList')} count={email.length}>
            {email.length ? email.map(row) : <Text style={[type.body, { padding: space.lg }]}>{t('bait.emailEmpty')}</Text>}
          </ListCard>
          <ListCard title={t('bait.decoyList')} count={decoys.length}>
            {decoys.length ? decoys.map(row) : <Text style={[type.body, { padding: space.lg }]}>{t('bait.decoyEmpty')}</Text>}
          </ListCard>
          <PrimaryButton icon={PlusIcon} label={t('baitW.createAnother')} onPress={() => router.navigate('/bait-new')} />
        </>
      )}

      <InfoBox title={t('bait.limits.title')} body={t('bait.limits.body')} />
      {v.showSample && (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <SampleBadge />
          <Text style={[type.body, { fontSize: 13, flex: 1 }]}>{t('bait.sampleNote')}</Text>
        </View>
      )}
    </Screen>
  );
}
