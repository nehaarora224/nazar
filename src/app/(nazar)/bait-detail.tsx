import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { EyeIcon, PauseIcon, PlayIcon, TrashIcon } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmailPreview, REVIEW_TONE, reviewKey, SEND_TONE, SendButton, sendLabel, useReviewEvent } from '../../components/BaitParts';
import { useOverlay } from '../../components/Overlay';
import { Screen } from '../../components/Screen';
import { Card, ConfirmButton, InfoBox, ListCard, PageTitle, SampleBadge, SecondaryButton, StatusLine, SubHeader, TonalButton } from '../../components/ui';
import { baitServiceConfigured, fetchLinkEvents, sendBaitEmail } from '../../baitService';
import { tplKey } from '../../content/templates';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { colors, fonts, space, Tone, type } from '../../theme';
import { EventView, useView } from '../../view';

type Item = { key: string; at: number; title: string; body?: string; tone: Tone; event?: EventView };

/** One bait: details, send status, preview, and its activity timeline with "Review event". */
export default function BaitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, setBaitActive, deleteBait, setEmailSend, mergeLinkEvents } = useStore();
  const v = useView();
  const { t, when, dur } = useT();
  const { openSheet, closeSheet, toast } = useOverlay();
  const review = useReviewEvent();
  const [busy, setBusy] = useState(false);
  const bait = v.baits.find((b) => b.id === id);
  const real = bait && !bait.sample ? data.emailBaits.find((b) => b.id === bait.id) : undefined;

  useFocusEffect(
    useCallback(() => {
      if (baitServiceConfigured && real?.remoteId && real.send.status === 'sent')
        fetchLinkEvents(real.remoteId, data.ownerSecret).then((list) => list && mergeLinkEvents(real.id, list));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [real?.id, real?.send.status]),
  );

  if (!bait) {
    return (
      <Screen header={<SubHeader title={t('bait.title')} onBack={() => router.navigate('/bait')} />}>
        <Text style={type.body}>{t('bd.notFound')}</Text>
      </Screen>
    );
  }

  const isEmail = bait.kind === 'email';
  const sendStatus = bait.send?.status ?? 'not_sent';
  const events = v.events.filter((e) => e.baitId === bait.id);

  const send = async () => {
    if (!real) return;
    setBusy(true);
    setEmailSend(real.id, { status: 'sending' });
    // A deliberate resend is a new attempt; the timestamped key guards only against replaying it.
    const res = await sendBaitEmail({ recipient: real.recipient, template: real.template, name: real.name, subject: t(tplKey(real.template, 'subject')), body: t(tplKey(real.template, 'body')), ownerSecret: data.ownerSecret, idempotencyKey: `${real.id}:${Date.now()}` });
    if (res.ok) {
      setEmailSend(real.id, { status: 'sent', at: Date.now() }, res.remoteId);
      toast(t('be.sentOk'));
    } else {
      setEmailSend(real.id, { status: res.reason === 'unavailable' ? 'unavailable' : 'failed', at: Date.now(), error: res.error });
      toast(res.reason === 'unavailable' ? t('be.unavailableShort') : t('be.failedShort'));
    }
    setBusy(false);
  };

  // Timeline: newest first.
  const items: Item[] = [
    ...events.map((e) => ({
      key: e.id,
      at: e.at,
      title: t(e.kind === 'link' ? 'tl.opened' : 'tl.openedDecoy'),
      body: [e.detail, e.durationMs ? t('bd.openFor', { d: dur(e.durationMs) }) : undefined].filter(Boolean).join(' · ') || undefined,
      tone: REVIEW_TONE[e.review ?? 'pending'],
      event: e,
    })),
    ...(isEmail && bait.send?.at && sendStatus !== 'sending'
      ? [
          {
            key: 'send',
            at: bait.send.at,
            title: t(sendStatus === 'sent' ? 'tl.sent' : sendStatus === 'unavailable' ? 'tl.unavailable' : 'tl.failed', { to: bait.recipient ?? '' }),
            body: sendStatus === 'failed' ? bait.send.error : undefined,
            tone: SEND_TONE[sendStatus],
          },
        ]
      : []),
    { key: 'created', at: bait.createdAt, title: t('tl.created'), tone: 'off' as Tone },
  ].sort((a, b) => b.at - a.at);

  const typeLabel = isEmail ? t(tplKey(bait.template!, 'name')) : t(`bait.type.${bait.decoyType!}`);

  return (
    <Screen header={<SubHeader title={t('bait.title')} onBack={() => router.navigate('/bait')} />}>
      <PageTitle title={bait.name} sub={typeLabel} />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {(!isEmail || sendStatus === 'sent' || !bait.active) && (
          <StatusLine t={bait.active ? 'safe' : 'off'} label={bait.active ? t('bait.status.active') : t('bait.status.inactive')} />
        )}
        {isEmail && <StatusLine t={SEND_TONE[sendStatus]} label={sendLabel(bait, t, when)} />}
        {bait.sample && <SampleBadge />}
      </View>
      {bait.sample && <InfoBox body={t('sample.readonly')} />}

      <Card>
        <View style={{ gap: space.md }}>
          <KV label={t('bd.type')} value={typeLabel} />
          {isEmail && <KV label={t('bd.recipient')} value={bait.recipient ?? ''} />}
          <KV label={t('bd.created')} value={when(bait.createdAt)} />
          {!isEmail && <KV label={t('bd.where')} value={t(`bn.where.${bait.decoyType!}`)} />}
        </View>
      </Card>

      {isEmail && !bait.sample && sendStatus !== 'sent' && (
        <>
          {sendStatus === 'unavailable' && <InfoBox kind="warn" title={t('send.unavailable')} body={t('be.unavailable')} />}
          {sendStatus === 'failed' && <InfoBox kind="error" title={t('send.failed')} body={t('be.failed', { e: bait.send?.error ?? '' })} />}
          {sendStatus === 'not_sent' && <InfoBox body={t('bd.draft')} />}
          {busy || sendStatus === 'sending' ? (
            <SecondaryButton label={t('send.sending')} disabled />
          ) : sendStatus === 'unavailable' && !baitServiceConfigured ? null : (
            <SendButton label={sendStatus === 'not_sent' ? t('be.send') : t('bd.resend')} recipient={bait.recipient ?? ''} onConfirm={send} />
          )}
        </>
      )}
      {isEmail && (
        <TonalButton
          icon={EyeIcon}
          label={t('be.previewTitle')}
          onPress={() =>
            openSheet(
              <>
                <EmailPreview template={bait.template!} recipient={bait.recipient ?? ''} />
                <TonalButton label={t('common.close')} onPress={closeSheet} />
              </>,
            )
          }
        />
      )}

      <ListCard title={t('bd.timeline')} count={events.length}>
        {items.map((it, i) => (
          <View key={it.key} style={[styles.tl, i > 0 && styles.tlDivider]}>
            <View style={styles.tlRail}>
              <View style={[styles.tlDot, { backgroundColor: it.tone === 'off' ? colors.checkOff : it.tone === 'act' ? colors.act : it.tone === 'look' ? colors.look : colors.safe }]} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.tlTitle}>{it.title}</Text>
              <Text style={styles.tlMeta}>{when(it.at)}</Text>
              {it.body ? <Text style={type.body}>{it.body}</Text> : null}
              {it.event && (
                <>
                  <StatusLine t={REVIEW_TONE[it.event.review ?? 'pending']} label={t(reviewKey(it.event))} sample={it.event.sample} />
                  <SecondaryButton label={t('bd.review')} onPress={() => review(it.event!)} style={{ alignSelf: 'flex-start', minHeight: 40, marginTop: 4 }} />
                </>
              )}
            </View>
          </View>
        ))}
        {events.length === 0 && <Text style={[type.body, { paddingHorizontal: 16, paddingBottom: 14 }]}>{isEmail ? t('bd.noLinkYet') : t('bd.eventsEmpty')}</Text>}
      </ListCard>

      {!bait.sample && (
        <>
          <SecondaryButton icon={bait.active ? PauseIcon : PlayIcon} label={bait.active ? t('bd.pause') : t('bd.resume')} onPress={() => setBaitActive(bait.id, !bait.active)} />
          <ConfirmButton
            icon={TrashIcon}
            label={t('bd.delete')}
            confirmLabel={t('bd.deleteConfirm')}
            onConfirm={() => {
              deleteBait(bait.id);
              router.navigate('/bait');
            }}
          />
        </>
      )}
    </Screen>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={type.overline}>{label}</Text>
      <Text style={type.bodyInk}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tl: { flexDirection: 'row', gap: 12, marginHorizontal: 16, paddingVertical: 12 },
  tlDivider: { borderTopWidth: 1, borderTopColor: 'rgba(31,28,46,0.07)' },
  tlRail: { width: 12, alignItems: 'center', paddingTop: 5 },
  tlDot: { width: 10, height: 10, borderRadius: 5 },
  tlTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  tlMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
