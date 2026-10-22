import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Choice, Field, InfoBox, PageTitle, PrimaryButton, SubHeader } from '../../components/ui';
import { REVIEW_SERVICES, REVIEW_SERVICE_BY_ID, serviceNameKey } from '../../content/reviewServices';
import { useT } from '../../i18n';
import { ReviewServiceId, useStore } from '../../store';
import { space } from '../../theme';

/** Add an account to review. Nazar stores only the person's own notes — it never signs in. */
export default function AccountAdd() {
  const { addReviewAccount } = useStore();
  const { t } = useT();
  const [service, setService] = useState<ReviewServiceId>('google');
  const [customName, setCustomName] = useState('');
  const [label, setLabel] = useState('');
  const [tried, setTried] = useState(false);

  const isCustom = service === 'custom';
  const customOk = !isCustom || customName.trim().length > 0;

  const add = () => {
    setTried(true);
    if (!customOk) return;
    const serviceName = isCustom ? customName.trim() : (REVIEW_SERVICE_BY_ID[service].brand ?? t(serviceNameKey(service)));
    const id = addReviewAccount({ service, serviceName, label: label.trim() || undefined });
    router.replace({ pathname: '/review-account', params: { id } });
  };

  return (
    <Screen header={<SubHeader title={t('racc.addTitle')} onBack={() => router.navigate('/accounts')} />}>
      <PageTitle title={t('racc.addTitle')} sub={t('racc.addSub')} />

      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        {REVIEW_SERVICES.map((s) => (
          <Choice key={s.id} icon={s.icon} label={t(serviceNameKey(s.id))} selected={service === s.id} onPress={() => setService(s.id)} />
        ))}
      </View>

      {isCustom && (
        <Field
          label={t('racc.customName')}
          value={customName}
          onChange={setCustomName}
          placeholder={t('racc.customNamePh')}
          error={tried && !customOk ? t('racc.customRequired') : undefined}
        />
      )}

      <Field label={t('racc.label')} value={label} onChange={setLabel} placeholder={t('racc.labelPh')} />
      <InfoBox kind="warn" body={t('racc.noPassword')} />

      <PrimaryButton label={t('racc.create')} onPress={add} />
    </Screen>
  );
}
