import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowSquareOutIcon } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Card, Choice, InfoBox, NoteInput, PrimaryButton, SecondaryButton, Stats, SubHeader } from '../../components/ui';
import { ACCOUNT_CHECKS, checkKey } from '../../content/accountChecks';
import { accountSummary } from '../../derive';
import { useT } from '../../i18n';
import { AnswerStatus, useStore } from '../../store';
import { colors, space, type } from '../../theme';

/** The guided account check: intro, then one check per step, then a summary. */
export default function AccountCheck() {
  const params = useLocalSearchParams<{ start?: string; intro?: string }>();
  const { data, answerAccountCheck } = useStore();
  const { t } = useT();
  const [step, setStep] = useState<'intro' | number | 'done'>('intro');
  const [choice, setChoice] = useState<AnswerStatus | null>(null);
  const [note, setNote] = useState('');

  const load = (i: number) => {
    const c = ACCOUNT_CHECKS[i];
    const a = c && data.accountAnswers[c.id];
    setChoice(a?.status ?? null);
    setNote(a?.note ?? '');
    setStep(i);
  };

  // Each visit starts where the Accounts page asked (tab screens stay mounted between visits).
  useFocusEffect(
    useCallback(() => {
      if (params.intro === '1') setStep('intro');
      else load(Math.min(Number(params.start ?? 0) || 0, ACCOUNT_CHECKS.length - 1));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.start, params.intro]),
  );

  const leave = () => router.navigate('/accounts');

  if (step === 'intro') {
    return (
      <Screen header={<SubHeader title={t('acct.title')} onBack={leave} />}>
        <Text style={type.display} accessibilityRole="header">
          {t('flow.intro.title')}
        </Text>
        <Text style={type.bodyInk}>{t('flow.intro.what')}</Text>
        <Card>
          <View style={{ gap: space.sm }}>
            <Text style={type.bodyInk}>{t('flow.intro.auto')}</Text>
            <Text style={type.bodyInk}>{t('flow.intro.guided', { n: ACCOUNT_CHECKS.length })}</Text>
            <Text style={type.bodyInk}>{t('flow.intro.perms')}</Text>
          </View>
        </Card>
        <InfoBox kind="warn" body={t('flow.intro.alert')} />
        <PrimaryButton label={t('common.continue')} onPress={() => load(0)} />
      </Screen>
    );
  }

  if (step === 'done') {
    const s = accountSummary(data);
    return (
      <Screen header={<SubHeader title={t('acct.title')} onBack={leave} />}>
        <Text style={type.display} accessibilityRole="header">
          {t('flow.finish.title')}
        </Text>
        <Stats
          items={[
            { label: t('acct.statDone'), value: s.done },
            { label: t('acct.statReview'), value: s.review, t: s.review ? 'look' : undefined },
            { label: t('acct.statTodo'), value: s.todo },
          ]}
        />
        <Text style={type.body}>{t('flow.finish.body', { done: s.done, review: s.review, todo: s.todo })}</Text>
        <PrimaryButton label={t('common.done')} onPress={leave} />
      </Screen>
    );
  }

  const c = ACCOUNT_CHECKS[step];
  const save = (status: AnswerStatus) => {
    answerAccountCheck(c.id, status, status === 'review' ? note.trim() || undefined : undefined);
    if (step + 1 < ACCOUNT_CHECKS.length) load(step + 1);
    else setStep('done');
  };

  return (
    // Keyed by step so each check opens scrolled to the top.
    <Screen key={c.id} header={<SubHeader title={t('acct.title')} onBack={leave} />}>
      <Text style={styles.progress}>{t('flow.step', { i: step + 1, n: ACCOUNT_CHECKS.length })}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${((step + 1) / ACCOUNT_CHECKS.length) * 100}%` }]} />
      </View>

      <View style={{ gap: 4 }}>
        <Text style={type.display} accessibilityRole="header">
          {t(checkKey(c.id, 'title'))}
        </Text>
        <Text style={type.body}>
          {c.service} · {t('acct.guided')}
        </Text>
      </View>

      <Card>
        <View style={{ gap: space.sm }}>
          <Text style={type.label}>{t('flow.howTo')}</Text>
          <Text style={[type.bodyInk, { lineHeight: 23 }]}>{t(checkKey(c.id, 'steps'))}</Text>
        </View>
      </Card>
      {c.url && <SecondaryButton icon={ArrowSquareOutIcon} label={t('flow.openPage')} onPress={() => Linking.openURL(c.url!)} />}
      <Text style={type.body}>{t(checkKey(c.id, 'why'))}</Text>

      <Text style={[type.label, { marginTop: space.sm }]}>{t('flow.ask')}</Text>
      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        <Choice label={t('flow.ok')} t="safe" selected={choice === 'ok'} onPress={() => setChoice('ok')} />
        <Choice label={t('flow.review')} t="look" selected={choice === 'review'} onPress={() => setChoice('review')} />
      </View>
      {choice === 'review' && <NoteInput value={note} onChange={setNote} placeholder={t('flow.notePlaceholder')} />}

      <PrimaryButton label={t('common.next')} disabled={!choice} onPress={() => choice && save(choice)} />
      <SecondaryButton label={t('flow.skip')} onPress={() => save('skipped')} />
      <SecondaryButton label={t('flow.stop')} onPress={leave} style={{ borderColor: colors.border }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { ...type.overline },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.lavender, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
});
