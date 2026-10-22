import { router, useLocalSearchParams } from 'expo-router';
import { ArrowSquareOutIcon, TrashIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { useOverlay } from '../../components/Overlay';
import { SaveToVaultButton } from '../../components/SaveToVault';
import { Screen } from '../../components/Screen';
import { Card, Choice, ConfirmButton, Field, InfoBox, NoteInput, PageTitle, Pill, SecondaryButton, SubHeader } from '../../components/ui';
import { REVIEW_SERVICE_BY_ID, REVIEW_STATUS_META, serviceNameKey, serviceStepsKey } from '../../content/reviewServices';
import { useT } from '../../i18n';
import { REVIEW_STATUSES, ReviewAccountStatus } from '../../reviewAccounts';
import { useStore } from '../../store';
import { space, type } from '../../theme';

/** Detail + guided review for one user-added account: status, findings, edit, remove. */
export default function ReviewAccount() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, updateReviewAccount, removeReviewAccount } = useStore();
  const { t, when } = useT();
  const { toast } = useOverlay();
  const acc = data.reviewAccounts.find((a) => a.id === id);

  const [note, setNote] = useState(acc?.note ?? '');
  const [label, setLabel] = useState(acc?.label ?? '');
  const [name, setName] = useState(acc?.serviceName ?? '');

  if (!acc) {
    return (
      <Screen header={<SubHeader title={t('acct.title')} onBack={() => router.navigate('/accounts')} />}>
        <Text style={type.body}>{t('racc.notFound')}</Text>
      </Screen>
    );
  }

  const svc = REVIEW_SERVICE_BY_ID[acc.service];
  const isCustom = acc.service === 'custom';
  const displayName = isCustom ? acc.serviceName : t(serviceNameKey(acc.service));
  const meta = REVIEW_STATUS_META[acc.status];
  const saved = data.evidence.some((e) => e.kind === 'note' && e.refId === acc.id);

  const setStatus = (s: ReviewAccountStatus) => updateReviewAccount(acc.id, { status: s });
  const saveNote = () => {
    updateReviewAccount(acc.id, { note });
    toast(t('racc.noteSaved'));
  };
  const saveDetails = () => {
    updateReviewAccount(acc.id, { label, serviceName: isCustom ? name : acc.serviceName });
    toast(t('racc.detailsSaved'));
  };
  const remove = () => {
    removeReviewAccount(acc.id);
    toast(t('racc.removed'));
    router.navigate('/accounts');
  };

  return (
    <Screen header={<SubHeader title={t('acct.title')} onBack={() => router.navigate('/accounts')} />}>
      <View style={{ gap: 8 }}>
        <PageTitle title={displayName} sub={acc.label ? `${acc.label} · ${t('racc.addedBy')}` : t('racc.addedBy')} />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill t={meta.tone} label={t(meta.key)} />
          <Text style={[type.body, { fontSize: 13 }]}>{t('acct.checkedAt', { when: when(acc.updatedAt) })}</Text>
        </View>
      </View>

      <InfoBox body={t('racc.notReadable')} />

      {/* Guided review */}
      <Card>
        <View style={{ gap: space.sm }}>
          <Text style={type.label}>{t('racc.reviewTitle')}</Text>
          <Text style={[type.bodyInk, { lineHeight: 23 }]}>{t(serviceStepsKey(acc.service))}</Text>
        </View>
      </Card>
      {svc.url ? (
        <SecondaryButton icon={ArrowSquareOutIcon} label={t('racc.openPage')} onPress={() => Linking.openURL(svc.url!)} />
      ) : (
        <InfoBox body={t('racc.noPageNote')} />
      )}

      {/* Status */}
      <Text style={[type.label, { marginTop: space.sm }]}>{t('racc.setStatus')}</Text>
      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        {REVIEW_STATUSES.map((s) => (
          <Choice key={s} t={REVIEW_STATUS_META[s].tone} label={t(REVIEW_STATUS_META[s].key)} selected={acc.status === s} onPress={() => setStatus(s)} />
        ))}
      </View>

      {/* Findings (user-reported) */}
      <Text style={[type.label, { marginTop: space.sm }]}>{t('racc.findings')}</Text>
      <NoteInput value={note} onChange={setNote} placeholder={t('racc.findingsPh')} />
      <SecondaryButton label={t('racc.saveNote')} onPress={saveNote} />
      {acc.status === 'unfamiliar' && (
        <SaveToVaultButton
          saved={saved}
          item={{ kind: 'note', refId: acc.id, eventAt: acc.updatedAt, title: t('racc.vaultTitle', { service: displayName }), category: 'account', note: note.trim() || acc.note }}
        />
      )}

      {/* Edit details */}
      <Text style={[type.label, { marginTop: space.sm }]}>{t('racc.detailsTitle')}</Text>
      {isCustom && <Field label={t('racc.customName')} value={name} onChange={setName} placeholder={t('racc.customNamePh')} />}
      <Field label={t('racc.label')} value={label} onChange={setLabel} placeholder={t('racc.labelPh')} />
      <SecondaryButton label={t('racc.saveDetails')} onPress={saveDetails} />

      <ConfirmButton icon={TrashIcon} label={t('racc.remove')} confirmLabel={t('racc.removeConfirm')} onConfirm={remove} />
    </Screen>
  );
}
