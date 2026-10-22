import { router, useLocalSearchParams } from 'expo-router';
import { ArrowSquareOutIcon, TrashIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { useOverlay } from '../../components/Overlay';
import { Screen } from '../../components/Screen';
import { Card, Chips, ConfirmButton, Field, InfoBox, NoteInput, PageTitle, Pill, PrimaryButton, SampleBadge, StatusLine, SubHeader, TonalButton } from '../../components/ui';
import { evidenceDetail, evidenceTitle, SOURCE_KEY } from '../../content/evidence';
import { useT } from '../../i18n';
import { Evidence, EvidencePatch, ManualCategory, Severity, useStore } from '../../store';
import { space, type } from '../../theme';
import { useView } from '../../view';
import { manualItem, SEVERITY_ORDER, SEVERITY_TONE } from '../../vaultModel';

const EDIT_CATEGORIES: ManualCategory[] = ['suspicious_login', 'location_exposure', 'unfamiliar_device', 'message_email', 'tracker_concern', 'other'];

const fmtSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** One Vault record: the original details, a transparent classification, the person's notes, and
 * (for hand-added records) full editing. Auto-collected items aren't opened here — they link to
 * their source — so everything shown here is a real saved record. */
export default function EvidenceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { setEvidenceNote, removeEvidence } = useStore();
  const v = useView();
  const { t, when, dur } = useT();
  const { toast } = useOverlay();
  const e = v.evidence.find((x) => x.id === id);

  if (!e) {
    return (
      <Screen header={<SubHeader title={t('ev.title')} onBack={() => router.navigate('/vault')} />}>
        <Text style={type.body}>{t('ev.notFound')}</Text>
      </Screen>
    );
  }

  const cls = manualItem(e);
  const isNote = e.kind === 'note';
  const editable = isNote && !e.sample;

  const openSource = () => {
    if (e.kind === 'bait' || e.kind === 'link') router.navigate('/bait');
    else if (e.kind === 'tracker') router.navigate(e.sample ? '/tracker' : { pathname: '/tracker-detail', params: { id: e.refId } });
    else if (e.kind === 'account') router.navigate(e.sample ? { pathname: '/session', params: { id: e.refId } } : { pathname: '/account-item', params: { id: e.checkId } });
    else if (e.kind === 'quiet' || e.kind === 'audit') router.navigate('/digital-footprint-audit');
    else if (e.kind === 'permaudit') router.navigate('/permission-audit');
    else if (e.kind === 'ble') router.navigate('/tracker');
  };
  const hasSource = e.kind !== 'note';

  return (
    <Screen header={<SubHeader title={t('ev.title')} onBack={() => router.navigate('/vault')} />}>
      <PageTitle title={evidenceTitle(e, t)} sub={t(SOURCE_KEY[e.kind])} />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <StatusLine t="safe" label={t('vault.status.saved')} />
        <Pill t="off" label={t('vault.origin.manual')} />
        {e.sample && <SampleBadge />}
      </View>
      {e.sample && <InfoBox body={t('sample.readonly')} />}

      {/* Original record — kept separate from the classification and the person's notes. */}
      <Card>
        <View style={{ gap: space.md }}>
          <KV label={t('ev.recorded')} value={[evidenceTitle(e, t), ...evidenceDetail(e, t, dur)].join('\n')} />
          {isNote && e.discovery ? <KV label={t('ev.discovery')} value={e.discovery} /> : null}
          <KV label={t('ev.happened')} value={when(e.eventAt)} />
          <KV label={t('ev.saved')} value={when(e.savedAt)} />
          <KV label={t('ev.source')} value={t(SOURCE_KEY[e.kind])} />
        </View>
      </Card>

      {isNote && e.attachment ? <AttachmentCard uri={e.attachment.dataUrl} size={e.attachment.size} /> : null}

      {/* Transparent classification — a suggestion from simple rules, never a detection. */}
      <Card>
        <View style={{ gap: space.sm }}>
          <Text style={type.overline}>{t('ev.class')}</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Pill t="off" label={t(`rel.${cls.relevance}`)} />
            <Pill t={SEVERITY_TONE[cls.severity]} label={t(`sev.${cls.severity}`)} />
          </View>
          <Text style={type.overline}>{t('ev.whyClass')}</Text>
          {cls.reasons.map((r) => (
            <Text key={r} style={[type.bodyInk, { lineHeight: 21 }]}>
              · {t(r)}
            </Text>
          ))}
          <Text style={[type.body, { fontSize: 13 }]}>{t('ev.classNote')}</Text>
        </View>
      </Card>

      {editable && <NoteEditor key={`${e.id}:edit`} e={e} />}

      {/* Review notes — the person's own words, stored apart from the original and the classification. */}
      <Card>
        <View style={{ gap: space.sm }}>
          <Text style={type.overline}>{t('ev.notes')}</Text>
          {e.sample ? (
            <Text style={type.bodyInk}>{e.reviewNote ?? t('ev.noNotes')}</Text>
          ) : (
            <NotesEditor
              key={`${e.id}:${e.reviewNote ?? ''}`}
              initial={e.reviewNote ?? ''}
              onSave={(note) => {
                setEvidenceNote(e.id, note.trim());
                toast(t('ev.noteSaved'));
              }}
            />
          )}
        </View>
      </Card>

      {hasSource && <TonalButton icon={ArrowSquareOutIcon} label={t('ev.openSource')} onPress={openSource} />}
      {!e.sample && (
        <ConfirmButton
          icon={TrashIcon}
          label={t('vault.remove')}
          confirmLabel={t('vault.removeConfirm')}
          onConfirm={() => {
            removeEvidence(e.id);
            router.navigate('/vault');
          }}
        />
      )}
    </Screen>
  );
}

/** The encrypted attachment, with a guard for a missing or unreadable image. */
function AttachmentCard({ uri, size }: { uri: string; size: number }) {
  const { t } = useT();
  const [failed, setFailed] = useState(false);
  return (
    <Card>
      <View style={{ gap: space.sm, width: '100%' }}>
        <Text style={type.overline}>{t('ev.attachment')}</Text>
        {failed ? (
          <InfoBox kind="warn" body={t('vaultAdd.attachFailed')} />
        ) : (
          <>
            <Image source={{ uri }} style={{ width: '100%', height: 220, borderRadius: 12 }} resizeMode="contain" onError={() => setFailed(true)} accessibilityLabel={t('ev.attachment')} />
            <Text style={[type.body, { fontSize: 13 }]}>{fmtSize(size)}</Text>
          </>
        )}
      </View>
    </Card>
  );
}

/** Full editing of a hand-added record: title, category, severity override, description, discovery. */
function NoteEditor({ e }: { e: Extract<Evidence, { kind: 'note' }> }) {
  const { updateEvidence } = useStore();
  const { toast } = useOverlay();
  const { t } = useT();
  const [title, setTitle] = useState(e.title);
  const [category, setCategory] = useState<ManualCategory>(e.category);
  const [severity, setSeverity] = useState<Severity>(e.severity ?? manualItem(e).severity);
  const [description, setDescription] = useState(e.description ?? '');
  const [discovery, setDiscovery] = useState(e.discovery ?? '');

  const dirty =
    title.trim() !== e.title ||
    category !== e.category ||
    severity !== (e.severity ?? manualItem(e).severity) ||
    (description.trim() || undefined) !== e.description ||
    (discovery.trim() || undefined) !== e.discovery;

  const saveChanges = () => {
    if (!title.trim()) return;
    const patch: EvidencePatch = {
      title: title.trim(),
      category,
      severity,
      description: description.trim() || undefined,
      discovery: discovery.trim() || undefined,
    };
    updateEvidence(e.id, patch);
    toast(t('ev.changesSaved'));
  };

  return (
    <Card>
      <View style={{ gap: space.sm, width: '100%' }}>
        <Text style={type.overline}>{t('ev.editTitle')}</Text>
        <Field label={t('vaultAdd.name')} value={title} onChange={setTitle} placeholder={t('vaultAdd.namePh')} />
        <Text style={type.label}>{t('ev.category')}</Text>
        <Chips<ManualCategory> value={category} onChange={setCategory} items={EDIT_CATEGORIES.map((c) => ({ key: c, label: t(`vault.cat.${c}`) }))} />
        <Text style={type.label}>{t('vaultAdd.severity')}</Text>
        <Chips<Severity> value={severity} onChange={setSeverity} items={SEVERITY_ORDER.map((s) => ({ key: s, label: t(`sev.${s}`) }))} />
        <Text style={type.label}>{t('ev.description')}</Text>
        <NoteInput value={description} onChange={setDescription} placeholder={t('vaultAdd.descPh')} />
        <Text style={type.label}>{t('ev.discovery')}</Text>
        <NoteInput value={discovery} onChange={setDiscovery} placeholder={t('vaultAdd.discoveryPh')} />
        <PrimaryButton label={t('ev.saveChanges')} disabled={!dirty} onPress={saveChanges} />
      </View>
    </Card>
  );
}

function NotesEditor({ initial, onSave }: { initial: string; onSave: (note: string) => void }) {
  const { t } = useT();
  const [note, setNote] = useState(initial);
  return (
    <>
      <NoteInput value={note} onChange={setNote} placeholder={t('ev.notesPh')} />
      <PrimaryButton label={t('ev.saveNote')} disabled={note === initial} onPress={() => onSave(note)} />
    </>
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
