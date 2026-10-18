import { router, useLocalSearchParams } from 'expo-router';
import { ArrowSquareOutIcon, LockSimpleIcon } from 'phosphor-react-native';
import { Linking, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Card, InfoBox, Pill, PrimaryButton, SecondaryButton, SubHeader } from '../../components/ui';
import { ACCOUNT_CHECKS, checkKey } from '../../content/accountChecks';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { space, type } from '../../theme';

/** Detail for one account check: what was found, why it matters, what is unknown, what to do. */
export default function AccountItem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveEvidence } = useStore();
  const { t, when } = useT();
  const idx = ACCOUNT_CHECKS.findIndex((c) => c.id === id);
  const c = ACCOUNT_CHECKS[idx];

  if (!c) {
    return (
      <Screen header={<SubHeader title={t('acct.title')} />}>
        <Text style={type.body}>{t('item.notFound')}</Text>
      </Screen>
    );
  }

  const a = data.accountAnswers[c.id];
  const saved = data.evidence.some((e) => e.kind === 'account' && e.refId === c.id);
  const found = !a
    ? t('item.notChecked')
    : a.status === 'ok'
      ? t('item.foundOk')
      : a.status === 'skipped'
        ? t('item.foundSkipped')
        : a.note || t('item.noteNone');

  return (
    <Screen header={<SubHeader title={t('acct.title')} />}>
      <View style={{ gap: 6 }}>
        <Text style={type.display} accessibilityRole="header">
          {t(checkKey(c.id, 'title'))}
        </Text>
        {a?.status === 'review' && <Pill t="look" label={t('acct.status.review')} />}
      </View>

      <Section title={t('item.found')}>
        <Text style={type.bodyInk}>{found}</Text>
        {a && <Text style={[type.body, { fontSize: 13 }]}>{`${t('common.recordedByYou')} · ${when(a.at)}`}</Text>}
      </Section>
      <Section title={t('item.service')}>
        <Text style={type.bodyInk}>{c.service}</Text>
      </Section>
      <Section title={t('item.why')}>
        <Text style={type.bodyInk}>{t(checkKey(c.id, 'why'))}</Text>
      </Section>
      <Section title={t('item.verified')}>
        <Text style={type.bodyInk}>{t('item.verifiedBody')}</Text>
      </Section>
      <Section title={t('item.unknown')}>
        <Text style={type.bodyInk}>{t('item.unknownBody')}</Text>
      </Section>
      <Section title={t('item.next')}>
        <Text style={type.bodyInk}>{t(checkKey(c.id, 'next'))}</Text>
      </Section>
      <InfoBox kind="warn" title={t('item.alert')} body={t('item.alertBody')} />

      {a?.status === 'review' && (
        <PrimaryButton
          icon={LockSimpleIcon}
          label={saved ? t('common.savedToVault') : t('common.saveToVault')}
          disabled={saved}
          onPress={() => saveEvidence({ kind: 'account', refId: c.id, eventAt: a.at, checkId: c.id, note: a.note })}
        />
      )}
      {c.url && <SecondaryButton icon={ArrowSquareOutIcon} label={t('flow.openPage')} onPress={() => Linking.openURL(c.url!)} />}
      <SecondaryButton
        label={a ? t('item.change') : t('acct.start')}
        onPress={() => router.navigate({ pathname: '/account-check', params: { start: String(idx), intro: '0' } })}
      />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <View style={{ gap: space.xs }}>
        <Text style={type.overline}>{title}</Text>
        {children}
      </View>
    </Card>
  );
}
