import { router } from 'expo-router';
import { ShareNetworkIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Card, InfoBox, ListCard, PageTitle, Pill, PrimaryButton, SampleBadge, SubHeader } from '../../components/ui';
import { AUDIT_MODULES, itemKey, moduleKey } from '../../content/audit';
import { TKey, useT } from '../../i18n';
import { AuditStatus } from '../../store';
import { colors, fonts, Tone, type } from '../../theme';
import { auditItemState, auditOverall, remediationSummary, useView } from '../../view';

const STATUS_TONE: Record<AuditStatus, Tone> = { not_checked: 'off', reviewed_ok: 'safe', exposure: 'look', na: 'off' };

/** A report built entirely from persisted audit records. No score; unchecked is shown as unchecked. */
export default function AuditReport() {
  const v = useView();
  const { t, when } = useT();
  const o = auditOverall(v);
  const rem = remediationSummary(v);
  const [shareFailed, setShareFailed] = useState(false);

  const realFindings = v.auditFindings.filter((f) => !f.sample);
  const realRemediation = v.remediation.filter((r) => !r.sample);

  const share = async () => {
    const lines = [t('afReport.title'), t('vault.report.created', { when: when(Date.now()) }), ''];
    lines.push(`${t('af.statChecked')}: ${o.checked}/${o.total}`, `${t('af.statExposures')}: ${realFindings.length}`, '');
    for (const m of AUDIT_MODULES) {
      const fs = realFindings.filter((f) => f.module === m.id);
      lines.push(`## ${t(moduleKey(m.id, 'title'))}`);
      for (const item of m.items) {
        const s = auditItemState(v, m.id, item.id);
        if (s && !s.sample) lines.push(`- ${t(itemKey(m.id, item.id, 'title'))}: ${t(`af.status.${s.status}` as TKey)}`);
      }
      for (const f of fs) lines.push(`  • ${t('af.exposure')}: ${f.title}${f.detail ? ` (${f.detail})` : ''}`);
      lines.push('');
    }
    if (realRemediation.length) {
      lines.push(`## ${t('af.remedyTitle')}`);
      for (const r of realRemediation) lines.push(`- [${t(`af.rem.${r.status}` as TKey)}] ${r.title}`);
    }
    try {
      await Share.share({ message: lines.join('\n'), title: t('afReport.title') });
      setShareFailed(false);
    } catch {
      setShareFailed(true);
    }
  };

  return (
    <Screen header={<SubHeader title={t('afReport.title')} onBack={() => router.navigate('/digital-footprint-audit')} />}>
      <PageTitle title={t('afReport.title')} sub={t('afReport.sub')} />

      <Card>
        <View style={{ gap: 4 }}>
          <Line label={t('af.statChecked')} value={`${o.checked} / ${o.total}`} />
          <Line label={t('afReport.notChecked')} value={String(o.total - o.checked)} />
          <Line label={t('af.statExposures')} value={String(o.findings)} />
          <Line label={t('afReport.completed')} value={String(rem.completed)} />
          <Line label={t('afReport.outstanding')} value={String(rem.planned)} />
        </View>
      </Card>

      {AUDIT_MODULES.map((m) => {
        const fs = v.auditFindings.filter((f) => f.module === m.id);
        return (
          <ListCard key={m.id} title={t(moduleKey(m.id, 'title'))}>
            <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
              {m.items.map((item) => {
                const s = auditItemState(v, m.id, item.id);
                return (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={[type.bodyInk, { flex: 1, fontSize: 14 }]}>{t(itemKey(m.id, item.id, 'title'))}</Text>
                    <Pill t={STATUS_TONE[s?.status ?? 'not_checked']} label={t(`af.status.${s?.status ?? 'not_checked'}` as TKey)} />
                  </View>
                );
              })}
              {fs.map((f) => (
                <View key={f.id} style={styles.finding}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Text style={[type.label, { fontSize: 14, flex: 1 }]}>{f.title}</Text>
                    {f.sample && <SampleBadge />}
                  </View>
                  {f.detail && <Text style={[type.body, { fontSize: 13 }]}>{f.detail}</Text>}
                  <Text style={[type.body, { fontSize: 13 }]}>{t('afReport.why')}</Text>
                </View>
              ))}
            </View>
          </ListCard>
        );
      })}

      {realFindings.length + realRemediation.length > 0 ? (
        <>
          <PrimaryButton icon={ShareNetworkIcon} label={t('afReport.share')} onPress={share} />
          <Text style={[type.body, { textAlign: 'center' }]}>{t('afReport.shareSub')}</Text>
          {shareFailed && <InfoBox kind="warn" body={t('vault.shareFail')} />}
        </>
      ) : (
        <InfoBox body={t('afReport.shareSampleNote')} />
      )}
      <InfoBox body={t('af.caveat')} />
    </Screen>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={[type.body, { flex: 1 }]}>{label}</Text>
      <Text style={styles.val}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  val: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  finding: { gap: 3, padding: 10, borderRadius: 12, backgroundColor: colors.lookBg },
});
