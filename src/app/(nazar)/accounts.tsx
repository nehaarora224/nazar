import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Card, InfoBox, Pill, PrimaryButton, SectionTitle, Stats, SubHeader } from '../../components/ui';
import { ACCOUNT_CHECKS, checkKey, SECTIONS } from '../../content/accountChecks';
import { accountSummary } from '../../derive';
import { useT } from '../../i18n';
import { AccountAnswer, useStore } from '../../store';
import { space, Tone, type } from '../../theme';

const STATUS: Record<AccountAnswer['status'] | 'none', { t: Tone; key: 'acct.status.ok' | 'acct.status.review' | 'acct.status.skipped' | 'acct.status.none' }> = {
  ok: { t: 'safe', key: 'acct.status.ok' },
  review: { t: 'look', key: 'acct.status.review' },
  skipped: { t: 'off', key: 'acct.status.skipped' },
  none: { t: 'off', key: 'acct.status.none' },
};

/** Accounts & Sessions: guided checks only. Nazar never touches the accounts themselves. */
export default function Accounts() {
  const { data } = useStore();
  const { t, when } = useT();
  const s = accountSummary(data);
  const firstOpen = ACCOUNT_CHECKS.findIndex((c) => !data.accountAnswers[c.id] || data.accountAnswers[c.id].status === 'skipped');

  return (
    <Screen header={<SubHeader title={t('acct.title')} />}>
      <Text style={type.body}>{t('acct.intro')}</Text>

      <Stats
        items={[
          { label: t('acct.statDone'), value: s.done },
          { label: t('acct.statReview'), value: s.review, t: s.review ? 'look' : undefined },
          { label: t('acct.statTodo'), value: s.todo },
        ]}
      />

      <PrimaryButton
        label={!s.started ? t('acct.start') : firstOpen >= 0 ? t('acct.resume') : t('acct.again')}
        onPress={() =>
          router.navigate({ pathname: '/account-check', params: { start: String(firstOpen >= 0 && s.started ? firstOpen : 0), intro: s.started ? '0' : '1' } })
        }
      />
      <InfoBox body={t('acct.how')} />

      {SECTIONS.map((sec) => (
        <View key={sec.id} style={{ gap: space.sm }}>
          <SectionTitle>{t(sec.title)}</SectionTitle>
          {ACCOUNT_CHECKS.filter((c) => c.section === sec.id).map((c) => {
            const a = data.accountAnswers[c.id];
            const st = STATUS[a?.status ?? 'none'];
            return (
              <Card
                key={c.id}
                onPress={() => router.navigate({ pathname: '/account-item', params: { id: c.id } })}
                label={`${t(checkKey(c.id, 'title'))}. ${t(st.key)}`}
                style={{ paddingVertical: 14 }}
              >
                <View style={{ gap: 4 }}>
                  <Text style={type.label}>{t(checkKey(c.id, 'title'))}</Text>
                  <Text style={[type.body, { fontSize: 14 }]}>
                    {c.service} · {t('acct.guided')}
                  </Text>
                  <View style={styles.row}>
                    <Pill t={st.t} label={t(st.key)} />
                    {a && <Text style={[type.body, { fontSize: 13 }]}>{when(a.at)}</Text>}
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 },
});
