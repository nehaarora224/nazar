import { router, useLocalSearchParams } from 'expo-router';
import { ArrowSquareOutIcon, PlusIcon, TrashIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { PhotoAudit } from '../../components/PhotoAudit';
import { SaveToVaultButton } from '../../components/SaveToVault';
import { Screen } from '../../components/Screen';
import { Card, Chips, ConfirmButton, InfoBox, ListCard, NoteInput, PageTitle, SampleBadge, SecondaryButton, StatusLine, SubHeader, TonalButton } from '../../components/ui';
import { AUDIT_MODULE, itemKey, moduleKey, remediationKey } from '../../content/audit';
import { TKey, useT } from '../../i18n';
import { AuditModuleId, AuditStatus, useStore } from '../../store';
import { colors, fonts, space, Tone, type } from '../../theme';
import { auditItemState, useView } from '../../view';

const STATUS_TONE: Record<AuditStatus, Tone> = { not_checked: 'off', reviewed_ok: 'safe', exposure: 'look', na: 'off' };
const STATUSES: AuditStatus[] = ['not_checked', 'reviewed_ok', 'exposure', 'na'];

/** One module's guided checklist, its findings, and (for Photos) real EXIF extraction. */
export default function AuditModule() {
  const { module } = useLocalSearchParams<{ module: AuditModuleId }>();
  const v = useView();
  const { t } = useT();
  const mod = module && AUDIT_MODULE(module);

  if (!mod) {
    return (
      <Screen header={<SubHeader title={t('af.title')} onBack={() => router.navigate('/digital-footprint-audit')} />}>
        <Text style={type.body}>{t('af.moduleNotFound')}</Text>
      </Screen>
    );
  }

  const findings = v.auditFindings.filter((f) => f.module === module);

  return (
    <Screen header={<SubHeader title={t(moduleKey(mod.id, 'title'))} onBack={() => router.navigate('/digital-footprint-audit')} />}>
      <PageTitle title={t(moduleKey(mod.id, 'title'))} sub={t(moduleKey(mod.id, 'desc'))} />

      {mod.links && mod.links.length > 0 && (
        <View style={{ gap: 8 }}>
          {mod.links.map((l) => (
            <TonalButton key={l.url} icon={ArrowSquareOutIcon} label={t(l.labelKey)} onPress={() => Linking.openURL(l.url)} />
          ))}
        </View>
      )}

      {mod.items.map((item) => (
        <AuditItemCard key={item.id} module={mod.id} itemId={item.id} interactive={item.interactive} />
      ))}

      {findings.length > 0 && (
        <ListCard title={t('af.findingsIn')} count={findings.length}>
          {findings.map((f, i) => (
            <FindingRow key={f.id} id={f.id} first={i === 0} />
          ))}
        </ListCard>
      )}

      <InfoBox body={t('af.moduleCaveat')} />
    </Screen>
  );
}

function AuditItemCard({ module, itemId, interactive }: { module: AuditModuleId; itemId: string; interactive?: 'metadata' }) {
  const { setAuditItem, addFinding, addRemediation } = useStore();
  const v = useView();
  const { t } = useT();
  const state = auditItemState(v, module, itemId);
  const sample = state?.sample;
  const [note, setNote] = useState(state?.note ?? '');

  const setStatus = (status: AuditStatus) => {
    if (sample) return;
    setAuditItem(module, itemId, status, status === 'exposure' ? note.trim() || undefined : undefined);
    // Record a finding + a suggested action the first time an exposure is marked.
    if (status === 'exposure' && !v.auditFindings.some((f) => f.module === module && f.itemId === itemId)) {
      const id = addFinding({ module, itemId, title: t(itemKey(module, itemId, 'title')), detail: note.trim() || undefined, source: 'guided' });
      addRemediation({ module, findingId: id, title: t(remediationKey(module)) });
    }
  };

  const chips = STATUSES.map((s) => ({ key: s, label: t(`af.status.${s}` as TKey) }));

  return (
    <Card>
      <View style={{ gap: space.sm }}>
        <Text style={type.label}>{t(itemKey(module, itemId, 'title'))}</Text>
        <Text style={[type.body, { lineHeight: 21 }]}>{t(itemKey(module, itemId, 'desc'))}</Text>

        {interactive === 'metadata' && (
          <PhotoAudit
            onGpsFound={(count, detail) => {
              if (sample) return;
              setAuditItem(module, itemId, 'exposure');
              if (!v.auditFindings.some((f) => f.module === module && f.itemId === itemId)) {
                const id = addFinding({ module, itemId, title: t('photo.findingTitle', { n: count }), detail, source: 'metadata' });
                addRemediation({ module, findingId: id, title: t(remediationKey(module)) });
              }
            }}
          />
        )}

        {sample ? (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusLine t={STATUS_TONE[state!.status]} label={t(`af.status.${state!.status}` as TKey)} />
            <SampleBadge />
          </View>
        ) : (
          <>
            <Chips<AuditStatus> items={chips} value={state?.status ?? 'not_checked'} onChange={setStatus} />
            {(state?.status === 'exposure' || (!state && false)) && (
              <View style={{ gap: 8 }}>
                <NoteInput value={note} onChange={setNote} placeholder={t('af.notePh')} />
                <SecondaryButton
                  label={t('af.saveNote')}
                  onPress={() => setAuditItem(module, itemId, 'exposure', note.trim() || undefined)}
                />
              </View>
            )}
          </>
        )}
      </View>
    </Card>
  );
}

function FindingRow({ id, first }: { id: string; first?: boolean }) {
  const { removeFinding, addRemediation } = useStore();
  const v = useView();
  const { t, when } = useT();
  const f = v.auditFindings.find((x) => x.id === id);
  if (!f) return null;
  const saved = v.isSaved('audit', f.id);

  return (
    <View style={[styles.finding, !first && styles.divider]}>
      <View style={{ gap: 4 }}>
        <Text style={type.label}>{f.title}</Text>
        {f.detail && <Text style={type.body}>{f.detail}</Text>}
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusLine t="look" label={t('af.exposure')} sample={f.sample} />
          <Text style={styles.meta}>· {t(`af.source.${f.source}` as TKey)}</Text>
          <Text style={styles.meta}>· {when(f.at)}</Text>
        </View>
      </View>
      {!f.sample && (
        <View style={styles.actions}>
          <SaveToVaultButton saved={saved} item={{ kind: 'audit', refId: f.id, eventAt: f.at, module: f.module, title: f.title, note: f.detail }} />
          <TonalButton icon={PlusIcon} label={t('af.addAction')} onPress={() => addRemediation({ module: f.module, findingId: f.id, title: t(remediationKey(f.module)) })} />
          <ConfirmButton icon={TrashIcon} label={t('af.removeFinding')} confirmLabel={t('vault.removeConfirm')} onConfirm={() => removeFinding(f.id)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  finding: { gap: 10, marginHorizontal: 10, paddingVertical: 14, paddingHorizontal: 6 },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(31,28,46,0.07)' },
  actions: { gap: 8 },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
