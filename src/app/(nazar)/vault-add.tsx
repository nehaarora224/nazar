import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useOverlay } from '../../components/Overlay';
import { Screen } from '../../components/Screen';
import { Chips, Field, NoteInput, PageTitle, PrimaryButton, SubHeader } from '../../components/ui';
import { ManualCategory, useStore } from '../../store';
import { useT } from '../../i18n';
import { space, type } from '../../theme';

const CATEGORIES: ManualCategory[] = ['incident', 'bait', 'tracker', 'account', 'audit', 'other'];
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** A simple form to add a record to the Vault by hand. Default date is today; a past date is allowed. */
export default function VaultAdd() {
  const { saveEvidence } = useStore();
  const { toast } = useOverlay();
  const { t } = useT();
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ManualCategory>('incident');
  const [date, setDate] = useState(iso);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);

  const titleErr = tried && !title.trim() ? t('vaultAdd.titleRequired') : undefined;

  const save = () => {
    setTried(true);
    if (!title.trim()) return;
    const parsed = Date.parse(date);
    const eventAt = Number.isNaN(parsed) ? Date.now() : Math.min(parsed, Date.now());
    saveEvidence({ kind: 'note', refId: uid(), eventAt, title: title.trim(), category, note: note.trim() || undefined });
    toast(t('vaultAdd.saved'));
    router.navigate('/vault');
  };

  return (
    <Screen header={<SubHeader title={t('vaultAdd.title')} onBack={() => router.navigate('/vault')} />}>
      <PageTitle title={t('vaultAdd.title')} sub={t('vaultAdd.sub')} />
      <Field label={t('vaultAdd.name')} value={title} onChange={setTitle} placeholder={t('vaultAdd.namePh')} error={titleErr} />
      <View style={{ gap: 8 }}>
        <Text style={type.label}>{t('vaultAdd.cat')}</Text>
        <Chips<ManualCategory> value={category} onChange={setCategory} items={CATEGORIES.map((c) => ({ key: c, label: t(`vault.cat.${c}`) }))} />
      </View>
      <Field label={t('vaultAdd.date')} value={date} onChange={setDate} placeholder="YYYY-MM-DD" />
      <View style={{ gap: 6, marginTop: space.xs }}>
        <NoteInput value={note} onChange={setNote} placeholder={t('vaultAdd.notePh')} />
      </View>
      <PrimaryButton label={t('vaultAdd.save')} onPress={save} />
    </Screen>
  );
}
