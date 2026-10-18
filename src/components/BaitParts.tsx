import { router } from 'expo-router';
import { CheckCircleIcon, QuestionIcon, XCircleIcon } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { tplKey } from '../content/templates';
import { TKey, useT } from '../i18n';
import { EventReview, SendStatus, TemplateId, useStore } from '../store';
import { colors, fonts, radius, Tone, type } from '../theme';
import { BaitView, EventView, useView } from '../view';
import { SheetHead, useOverlay } from './Overlay';
import { useConfirmSave } from './SaveToVault';
import { Choice, PrimaryButton, TonalButton } from './ui';

export const SEND_TONE: Record<SendStatus, Tone> = { not_sent: 'off', sending: 'off', sent: 'safe', failed: 'act', unavailable: 'look' };
export const REVIEW_TONE: Record<EventReview | 'pending', Tone> = { pending: 'look', unsure: 'look', me: 'safe', notMe: 'act' };

/** What the bait email looks like. Generic sender, no brand, a button that is the private link. */
export function EmailPreview({ template, recipient }: { template: TemplateId; recipient: string }) {
  const { t } = useT();
  return (
    <View style={styles.mail} accessibilityLabel={t('be.previewTitle')}>
      <View style={styles.mailHead}>
        <Text style={styles.mailMeta}>{t('be.from')}</Text>
        <Text style={styles.mailMeta}>{t('be.to', { to: recipient || '—' })}</Text>
        <Text style={styles.mailSubject}>{t(tplKey(template, 'subject'))}</Text>
      </View>
      <View style={styles.mailBody}>
        <Text style={type.bodyInk}>{t(tplKey(template, 'body'))}</Text>
        <View style={styles.mailCta}>
          <Text style={styles.mailCtaText}>{t(tplKey(template, 'cta'))}</Text>
        </View>
      </View>
      <Text style={[type.body, { fontSize: 13, paddingHorizontal: 14, paddingBottom: 12 }]}>{t('be.linkNote')}</Text>
    </View>
  );
}

/** "Was this you?" with three answers. "No" offers to save to the Vault, after confirming. */
export function useReviewEvent() {
  const { reviewEvent } = useStore();
  const v = useView();
  const { openSheet, closeSheet, toast } = useOverlay();
  const confirmSave = useConfirmSave();
  const { t, when } = useT();

  return (e: EventView) => {
    const bait = v.baitOf(e.baitId);
    const answer = (r: EventReview) => {
      closeSheet();
      if (e.sample) {
        toast(t('sample.notSaved'));
        return;
      }
      reviewEvent(e.id, r);
      if (r === 'notMe' && bait) {
        if (v.isSaved(e.kind === 'link' ? 'link' : 'bait', e.id)) return toast(t('wty.markedNotMe'));
        const item =
          e.kind === 'link'
            ? { kind: 'link' as const, refId: e.id, eventAt: e.at, baitName: bait.name, template: bait.template!, detail: e.detail }
            : { kind: 'bait' as const, refId: e.id, eventAt: e.at, baitName: bait.name, baitType: bait.decoyType!, durationMs: e.durationMs };
        // Let the first sheet close before asking about the Vault.
        setTimeout(() => confirmSave(item, { title: t('wty.saveTitle'), body: t('wty.saveBody') }), 50);
      } else toast(r === 'me' ? t('wty.markedMe') : t('wty.markedUnsure'));
    };
    const detail = e.detail ? ` · ${e.detail}` : '';
    openSheet(
      <>
        <SheetHead title={t('wty.title')} body={t(e.kind === 'link' ? 'wty.bodyLink' : 'wty.bodyDecoy', { name: bait?.name ?? '', when: when(e.at), detail })} />
        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          <Choice icon={CheckCircleIcon} label={t('wty.yes')} selected={e.review === 'me'} onPress={() => answer('me')} />
          <Choice icon={XCircleIcon} label={t('wty.no')} selected={e.review === 'notMe'} onPress={() => answer('notMe')} />
          <Choice icon={QuestionIcon} label={t('wty.unsure')} selected={e.review === 'unsure'} onPress={() => answer('unsure')} />
        </View>
        <Text style={[type.body, { fontSize: 14 }]}>{t('wty.note')}</Text>
        <TonalButton label={t('common.cancel')} onPress={closeSheet} />
      </>,
    );
  };
}

/** Label for an event's review state. */
export function reviewKey(e: EventView): TKey {
  return e.review === 'me' ? 'rev.me' : e.review === 'notMe' ? 'rev.notMe' : e.review === 'unsure' ? 'rev.unsure' : 'rev.pending';
}

/** Send-status label for an email bait. */
export function sendLabel(b: BaitView, t: (k: TKey, p?: Record<string, string | number>) => string, when: (n: number) => string) {
  const s = b.send?.status ?? 'not_sent';
  return s === 'sent' && b.send?.at ? t('send.sentAt', { when: when(b.send.at) }) : t(`send.${s}` as TKey);
}

export function goBait(id: string) {
  router.navigate({ pathname: '/bait-detail', params: { id } });
}

/** Primary button that opens the send confirmation sheet. */
export function SendButton({ label, onConfirm, recipient }: { label: string; onConfirm: () => void; recipient: string }) {
  const { openSheet, closeSheet } = useOverlay();
  const { t } = useT();
  return (
    <PrimaryButton
      label={label}
      onPress={() =>
        openSheet(
          <>
            <SheetHead title={t('be.confirmTitle')} body={t('be.confirmBody', { to: recipient })} />
            <PrimaryButton
              label={t('be.confirmSend')}
              onPress={() => {
                closeSheet();
                onConfirm();
              }}
            />
            <TonalButton label={t('common.cancel')} onPress={closeSheet} />
          </>,
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  mail: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  mailHead: { gap: 2, padding: 14, backgroundColor: colors.neutralBg },
  mailMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  mailSubject: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, marginTop: 4 },
  mailBody: { gap: 14, padding: 14 },
  mailCta: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#3B5BA9' },
  mailCtaText: { fontFamily: fonts.semibold, fontSize: 15, color: '#FFFFFF' },
});
