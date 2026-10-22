import { router } from 'expo-router';
import { ImageIcon, TrashIcon } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { pickImageAttachment } from '../../attachments';
import { useOverlay } from '../../components/Overlay';
import { Screen } from '../../components/Screen';
import { Chips, Field, NoteInput, PageTitle, Pill, PrimaryButton, SecondaryButton, SubHeader } from '../../components/ui';
import { useT } from '../../i18n';
import { Attachment, ManualCategory, Severity, useStore } from '../../store';
import { colors, radius, type } from '../../theme';
import { classify, SEVERITY_ORDER, SEVERITY_TONE } from '../../vaultModel';

const CATEGORIES: ManualCategory[] = ['suspicious_login', 'location_exposure', 'unfamiliar_device', 'message_email', 'tracker_concern', 'other'];
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const pad = (n: number) => String(n).padStart(2, '0');

/** Parse `YYYY-MM-DD` (+ optional `HH:MM`) into a timestamp, or null if malformed. Capped at now. */
function parseWhen(date: string, time: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return null;
  const hhmm = time.trim();
  const iso = hhmm ? (/^\d{1,2}:\d{2}$/.test(hhmm) ? `${date}T${pad(Number(hhmm.split(':')[0]))}:${hhmm.split(':')[1]}` : null) : `${date}T12:00`;
  if (iso === null) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return Math.min(ms, Date.now());
}

/**
 * Add an evidence record by hand: title, description, category, date/time, an optional encrypted
 * attachment and discovery note. A transparent suggested classification is shown and can be
 * overridden. Inputs are validated and saved persistently into the encrypted Vault.
 */
export default function VaultAdd() {
  const { saveEvidence } = useStore();
  const { toast } = useOverlay();
  const { t } = useT();
  const today = new Date();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ManualCategory>('suspicious_login');
  const [date, setDate] = useState(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
  const [time, setTime] = useState('');
  const [discovery, setDiscovery] = useState('');
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const [override, setOverride] = useState<Severity | null>(null);
  const [tried, setTried] = useState(false);

  // Transparent suggestion from the same rules the Vault uses — recomputed as the person types.
  const suggestion = useMemo(
    () => classify({ group: 'manual', confirmed: false, category, text: `${title} ${description} ${discovery}`.toLowerCase() }),
    [category, title, description, discovery],
  );
  const severity = override ?? suggestion.severity;

  const titleErr = tried && !title.trim() ? t('vaultAdd.titleRequired') : undefined;
  const dateErr = tried && parseWhen(date, time) === null ? t('vaultAdd.badDate') : undefined;

  const attach = async () => {
    const res = await pickImageAttachment();
    if (res.ok) setAttachment(res.attachment);
    else if (res.reason !== 'canceled')
      toast(t(res.reason === 'tooBig' ? 'vaultAdd.attachTooBig' : res.reason === 'denied' ? 'vaultAdd.attachDenied' : 'vaultAdd.attachFailed'));
  };

  const save = () => {
    setTried(true);
    const eventAt = parseWhen(date, time);
    if (!title.trim() || eventAt === null) return;
    saveEvidence({
      kind: 'note',
      refId: uid(),
      eventAt,
      title: title.trim(),
      category,
      description: description.trim() || undefined,
      discovery: discovery.trim() || undefined,
      attachment,
      // Store severity only when the person overrode the suggestion, so it stays explainable.
      severity: override ?? undefined,
    });
    toast(t('vaultAdd.saved'));
    router.navigate('/vault');
  };

  return (
    <Screen header={<SubHeader title={t('vaultAdd.title')} onBack={() => router.navigate('/vault')} />}>
      <PageTitle title={t('vaultAdd.title')} sub={t('vaultAdd.sub')} />

      <Field label={t('vaultAdd.name')} value={title} onChange={setTitle} placeholder={t('vaultAdd.namePh')} error={titleErr} />

      <View style={{ gap: 6 }}>
        <Text style={type.label}>{t('vaultAdd.desc')}</Text>
        <NoteInput value={description} onChange={setDescription} placeholder={t('vaultAdd.descPh')} />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={type.label}>{t('vaultAdd.cat')}</Text>
        <Chips<ManualCategory> value={category} onChange={setCategory} items={CATEGORIES.map((c) => ({ key: c, label: t(`vault.cat.${c}`) }))} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1.3 }}>
          <Field label={t('vaultAdd.date')} value={date} onChange={setDate} placeholder="YYYY-MM-DD" error={dateErr} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label={t('vaultAdd.time')} value={time} onChange={setTime} placeholder="HH:MM" />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={type.label}>{t('vaultAdd.attach')}</Text>
        {attachment ? (
          <View style={{ gap: 8 }}>
            <Image source={{ uri: attachment.dataUrl }} style={styles.preview} resizeMode="cover" accessibilityLabel={t('ev.attachment')} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SecondaryButton icon={ImageIcon} label={t('vaultAdd.attachChange')} onPress={attach} style={{ flex: 1 }} />
              <SecondaryButton tone="danger" icon={TrashIcon} label={t('vaultAdd.attachRemove')} onPress={() => setAttachment(undefined)} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <SecondaryButton icon={ImageIcon} label={t('vaultAdd.attach')} onPress={attach} />
        )}
        <Text style={[type.body, { fontSize: 13 }]}>{t('vaultAdd.attachNote')}</Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={type.label}>{t('vaultAdd.discovery')}</Text>
        <NoteInput value={discovery} onChange={setDiscovery} placeholder={t('vaultAdd.discoveryPh')} />
      </View>

      <View style={styles.suggest}>
        <Text style={type.overline}>{t('vaultAdd.suggested')}</Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Pill t="off" label={t('rel.reported')} />
          <Pill t={SEVERITY_TONE[suggestion.severity]} label={t(`sev.${suggestion.severity}`)} />
        </View>
        {suggestion.reasons.map((r) => (
          <Text key={r} style={[type.body, { fontSize: 13 }]}>
            · {t(r)}
          </Text>
        ))}
        <Text style={[type.label, { marginTop: 4 }]}>{t('vaultAdd.severity')}</Text>
        <Chips<Severity>
          value={severity}
          onChange={setOverride}
          items={SEVERITY_ORDER.map((s) => ({ key: s, label: t(`sev.${s}`) }))}
        />
        <Text style={[type.body, { fontSize: 13 }]}>{t('vaultAdd.override')}</Text>
      </View>

      <PrimaryButton label={t('vaultAdd.save')} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.offBg },
  suggest: { gap: 6, padding: 14, borderRadius: radius.md, backgroundColor: colors.lavenderSoft },
});
