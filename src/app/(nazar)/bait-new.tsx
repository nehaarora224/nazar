import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Card, Choice, InfoBox, PrimaryButton, SecondaryButton, SubHeader } from '../../components/ui';
import { useT } from '../../i18n';
import { BaitType, useStore } from '../../store';
import { colors, fonts, radius, space, type } from '../../theme';

const TYPES: BaitType[] = ['history', 'menu'];

/** Create a bait: how it works → choose a decoy → name it → what will be recorded → create. */
export default function BaitNew() {
  const { createBait } = useStore();
  const { t } = useT();
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<BaitType>('history');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);

  // A fresh form every visit (tab screens stay mounted).
  useFocusEffect(
    useCallback(() => {
      setStep(1);
      setKind('history');
      setName('');
      setTouched(false);
    }, []),
  );

  const back = () => (step > 1 ? setStep(step - 1) : router.navigate('/bait'));
  const pickType = (k: BaitType) => {
    setKind(k);
    if (!touched) setName('');
  };
  const goName = () => {
    if (!name) setName(t(`bn.suggest.${kind}`));
    setStep(3);
  };
  const create = () => {
    const id = createBait(name.trim(), kind);
    router.replace({ pathname: '/bait-detail', params: { id } });
  };

  return (
    <Screen key={step} header={<SubHeader title={t('bn.title')} onBack={back} />}>
      <Text style={type.overline}>{t('bn.step', { i: step })}</Text>

      {step === 1 && (
        <>
          <Text style={type.display} accessibilityRole="header">
            {t('bn.how')}
          </Text>
          <Text style={type.bodyInk}>{t('bn.howBody')}</Text>
          <InfoBox title={t('bait.limits.title')} body={t('bait.limits.body')} />
          <PrimaryButton label={t('common.next')} onPress={() => setStep(2)} />
        </>
      )}

      {step === 2 && (
        <>
          <Text style={type.display} accessibilityRole="header">
            {t('bn.choose')}
          </Text>
          <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
            {TYPES.map((k) => (
              <View key={k} style={{ gap: 4 }}>
                <Choice label={t(`bait.type.${k}`)} selected={kind === k} onPress={() => pickType(k)} />
                <Text style={[type.body, { fontSize: 14, paddingHorizontal: 4 }]}>{t(`bait.type.${k}.desc`)}</Text>
              </View>
            ))}
          </View>
          <PrimaryButton label={t('common.next')} onPress={goName} />
        </>
      )}

      {step === 3 && (
        <>
          <Text style={type.display} accessibilityRole="header">
            {t('bn.name')}
          </Text>
          <Text style={type.body}>{t('bn.nameHint')}</Text>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setTouched(true);
            }}
            maxLength={40}
            accessibilityLabel={t('bn.name')}
            style={styles.input}
            autoFocus
          />
          {!name.trim() && <Text style={[type.pill, { color: colors.actFg }]}>{t('bn.nameRequired')}</Text>}
          <PrimaryButton label={t('common.next')} disabled={!name.trim()} onPress={() => setStep(4)} />
        </>
      )}

      {step === 4 && (
        <>
          <Text style={type.display} accessibilityRole="header">
            {t('bn.observe')}
          </Text>
          <Card>
            <View style={{ gap: space.sm }}>
              <Text style={type.label}>“{name.trim()}”</Text>
              <Text style={[type.body, { fontSize: 14 }]}>{t(`bait.type.${kind}`)}</Text>
              <Text style={type.bodyInk}>{t('bn.observe.yes')}</Text>
              <Text style={type.bodyInk}>{t('bn.observe.no')}</Text>
              <Text style={type.bodyInk}>{`${t('bd.where')}: ${t(`bn.where.${kind}`)}`}</Text>
            </View>
          </Card>
          <InfoBox kind="warn" body={t('bn.dontOpen')} />
          <PrimaryButton label={t('bn.create')} onPress={create} />
          <SecondaryButton label={t('common.back')} onPress={back} style={{ borderColor: colors.border }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.ink,
    outlineColor: colors.primary,
  },
});
