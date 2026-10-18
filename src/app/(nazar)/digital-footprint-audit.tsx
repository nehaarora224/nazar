import { router } from 'expo-router';
import { CheckCircleIcon, CircleIcon, FileTextIcon, XCircleIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Card, InfoBox, ListCard, ListRow, PageTitle, PrimaryButton, SampleBanner, SectionTitle, Stats, StatusLine, SubHeader } from '../../components/ui';
import { AUDIT_MODULES, moduleKey } from '../../content/audit';
import { TKey, useT } from '../../i18n';
import { AuditModuleId, RemediationStatus, useStore } from '../../store';
import { colors, fonts, Tone, type } from '../../theme';
import { auditModuleSummary, auditOverall, remediationSummary, useView } from '../../view';

const REM_TONE: Record<RemediationStatus, Tone> = { planned: 'look', completed: 'safe', dismissed: 'off' };

/** Digital Footprint Audit hub: modules, remediation tracker, and the report. */
export default function DigitalFootprintAudit() {
  const v = useView();
  const { t } = useT();
  const o = auditOverall(v);
  const rem = remediationSummary(v);

  return (
    <Screen header={<SubHeader title={t('af.title')} />}>
      <PageTitle kicker={t('af.kicker')} title={t('af.title')} sub={t('af.intro')} />
      <SampleBanner />
      <Stats
        items={[
          { label: t('af.statChecked'), value: `${o.checked}/${o.total}` },
          { label: t('af.statExposures'), value: o.findings, t: o.findings ? 'look' : undefined },
          { label: t('af.statActions'), value: rem.planned, t: rem.planned ? 'look' : undefined },
        ]}
      />

      <ListCard title={t('af.modules')} count={AUDIT_MODULES.length}>
        {AUDIT_MODULES.map((m, i) => {
          const s = auditModuleSummary(v, m.id);
          const tone: Tone = s.exposure ? 'look' : s.checked === s.total ? 'safe' : 'off';
          const label = s.exposure
            ? t(s.exposure === 1 ? 'af.mod.exposure_one' : 'af.mod.exposure_other', { n: s.exposure })
            : s.checked === s.total
              ? t('af.mod.done')
              : t('af.mod.progress', { done: s.checked, total: s.total });
          return (
            <ListRow
              key={m.id}
              first={i === 0}
              icon={m.icon}
              title={t(moduleKey(m.id, 'title'))}
              status={<StatusLine t={tone} label={label} sample={s.sample} />}
              desc={t(moduleKey(m.id, 'desc'))}
              onPress={() => router.navigate({ pathname: '/audit-module', params: { module: m.id } })}
            />
          );
        })}
      </ListCard>

      <SectionTitle>{t('af.remedyTitle')}</SectionTitle>
      <Text style={[type.body, { fontSize: 14 }]}>{t('af.remedySub')}</Text>
      {v.remediation.length === 0 ? (
        <Card>
          <Text style={type.body}>{t('af.remedyEmpty')}</Text>
        </Card>
      ) : (
        <ListCard title={t('af.remedyList')} count={rem.total}>
          {[...v.remediation]
            .sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0) || b.updatedAt - a.updatedAt)
            .map((r, i) => (
              <RemediationRow key={r.id} id={r.id} title={r.title} module={r.module} status={r.status} completedAt={r.completedAt} sample={r.sample} first={i === 0} />
            ))}
        </ListCard>
      )}

      <PrimaryButton icon={FileTextIcon} label={t('af.viewReport')} onPress={() => router.navigate('/audit-report')} />
      <InfoBox body={t('af.caveat')} />
    </Screen>
  );
}

function RemediationRow({
  id,
  title,
  module,
  status,
  completedAt,
  sample,
  first,
}: {
  id: string;
  title: string;
  module?: AuditModuleId;
  status: RemediationStatus;
  completedAt?: number;
  sample?: boolean;
  first?: boolean;
}) {
  const { setRemediationStatus } = useStore();
  const { t, when } = useT();
  const Icon = status === 'completed' ? CheckCircleIcon : status === 'dismissed' ? XCircleIcon : CircleIcon;
  const cycle = () => {
    if (sample) return;
    setRemediationStatus(id, status === 'planned' ? 'completed' : status === 'completed' ? 'dismissed' : 'planned');
  };
  return (
    <View style={[styles.remRow, !first && styles.remDivider]}>
      <Pressable onPress={cycle} accessibilityRole="button" accessibilityLabel={`${title}. ${t(`af.rem.${status}` as TKey)}`} hitSlop={6} style={styles.remTap}>
        <Icon size={22} color={status === 'completed' ? colors.safe : status === 'dismissed' ? colors.muted : colors.primary} weight={status === 'completed' ? 'fill' : 'regular'} />
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.bodyInk, status === 'completed' && { color: colors.muted, textDecorationLine: 'line-through' }]}>{title}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusLine t={REM_TONE[status]} label={t(`af.rem.${status}` as TKey)} sample={sample} />
          {module && <Text style={styles.meta}>· {t(moduleKey(module, 'title'))}</Text>}
          {completedAt && <Text style={styles.meta}>· {when(completedAt)}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  remRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginHorizontal: 10, paddingVertical: 12, paddingHorizontal: 6 },
  remDivider: { borderTopWidth: 1, borderTopColor: 'rgba(31,28,46,0.07)' },
  remTap: { paddingTop: 1 },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
