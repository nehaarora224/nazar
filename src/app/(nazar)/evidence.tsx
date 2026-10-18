import { router, useLocalSearchParams } from 'expo-router';
import { ArrowSquareOutIcon, TrashIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useOverlay } from '../../components/Overlay';
import { Screen } from '../../components/Screen';
import { Card, ConfirmButton, InfoBox, NoteInput, PageTitle, PrimaryButton, SampleBadge, StatusLine, SubHeader, TonalButton } from '../../components/ui';
import { evidenceDetail, evidenceTitle, SOURCE_KEY } from '../../content/evidence';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { space, type } from '../../theme';
import { useView } from '../../view';

/** One Vault record: what was recorded, when, where it came from, and her review notes. */
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

  const openSource = () => {
    if (e.kind === 'bait' || e.kind === 'link') router.navigate('/bait');
    else if (e.kind === 'tracker') router.navigate(e.sample ? '/tracker' : { pathname: '/tracker-detail', params: { id: e.refId } });
    else if (e.kind === 'account') router.navigate(e.sample ? { pathname: '/session', params: { id: e.refId } } : { pathname: '/account-item', params: { id: e.checkId } });
    else if (e.kind === 'quiet' || e.kind === 'audit') router.navigate('/digital-footprint-audit');
    else if (e.kind === 'ble') router.navigate('/tracker');
  };

  return (
    <Screen header={<SubHeader title={t('ev.title')} onBack={() => router.navigate('/vault')} />}>
      <PageTitle title={evidenceTitle(e, t)} sub={t(SOURCE_KEY[e.kind])} />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <StatusLine t="safe" label={t('vault.status.saved')} />
        {e.sample && <SampleBadge />}
      </View>
      {e.sample && <InfoBox body={t('sample.readonly')} />}

      <Card>
        <View style={{ gap: space.md }}>
          <KV label={t('ev.recorded')} value={[evidenceTitle(e, t), ...evidenceDetail(e, t, dur)].join('\n')} />
          <KV label={t('ev.happened')} value={when(e.eventAt)} />
          <KV label={t('ev.saved')} value={when(e.savedAt)} />
          <KV label={t('ev.source')} value={t(SOURCE_KEY[e.kind])} />
        </View>
      </Card>

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

      <TonalButton icon={ArrowSquareOutIcon} label={t('ev.openSource')} onPress={openSource} />
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
