import { router } from 'expo-router';
import { AddressBookIcon, PhoneCallIcon, TrashIcon, UserCircleIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { useOverlay } from '../../components/Overlay';
import { Screen } from '../../components/Screen';
import { ConfirmButton, Empty, Field, InfoBox, ListCard, ListRow, PageTitle, PrimaryButton, SecondaryButton, SubHeader } from '../../components/ui';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { space } from '../../theme';

// A lenient phone check: real numbers vary a lot. Require digits/+/()/-/space and at least 3 digits.
const PHONE_OK = (s: string) => /^[+(]?[\d][\d\s()+-]{2,}$/.test(s.trim()) && (s.match(/\d/g)?.length ?? 0) >= 3;

/** Manage the person's own one-tap emergency contacts, shown beside the 181/112 helplines. */
export default function EmergencyContacts() {
  const { data, addEmergencyContact, removeEmergencyContact } = useStore();
  const { toast } = useOverlay();
  const { t } = useT();
  const contacts = data.emergencyContacts;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tried, setTried] = useState(false);

  const nameErr = tried && !name.trim() ? t('ec.nameReq') : undefined;
  const phoneErr = tried && !PHONE_OK(phone) ? t('ec.phoneReq') : undefined;

  const add = () => {
    setTried(true);
    if (!name.trim() || !PHONE_OK(phone)) return;
    addEmergencyContact(name, phone);
    setName('');
    setPhone('');
    setTried(false);
    toast(t('ec.added'));
  };

  return (
    <Screen header={<SubHeader title={t('ec.title')} onBack={() => (router.canGoBack() ? router.back() : router.navigate('/home'))} />}>
      <PageTitle title={t('ec.title')} sub={t('ec.sub')} />

      <View style={{ gap: space.sm }}>
        <Field label={t('ec.name')} value={name} onChange={setName} placeholder={t('ec.namePh')} error={nameErr} />
        <Field label={t('ec.phone')} value={phone} onChange={setPhone} placeholder={t('ec.phonePh')} error={phoneErr} />
        <PrimaryButton label={t('ec.save')} onPress={add} />
      </View>

      {contacts.length === 0 ? (
        <Empty icon={AddressBookIcon} title={t('ec.empty')} body={t('ec.emptyBody')} />
      ) : (
        <ListCard title={t('ec.yours')} count={contacts.length}>
          {contacts.map((c, i) => (
            <ListRow
              key={c.id}
              first={i === 0}
              icon={UserCircleIcon}
              title={c.name}
              desc={c.phone}
              action={
                <>
                  <SecondaryButton icon={PhoneCallIcon} label={t('help.call', { name: c.name })} onPress={() => Linking.openURL(`tel:${c.phone}`)} style={{ minHeight: 40 }} />
                  <ConfirmButton icon={TrashIcon} label={t('ec.remove')} confirmLabel={t('vault.removeConfirm')} onConfirm={() => removeEmergencyContact(c.id)} />
                </>
              }
            />
          ))}
        </ListCard>
      )}

      <InfoBox body={t('ec.callNote')} />
    </Screen>
  );
}
