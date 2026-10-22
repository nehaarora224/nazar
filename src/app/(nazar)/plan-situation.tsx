import { router } from 'expo-router';
import { CheckSquareIcon, SquareIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useOverlay } from '../../components/Overlay';
import { Screen } from '../../components/Screen';
import { InfoBox, NoteInput, PageTitle, PrimaryButton, SubHeader } from '../../components/ui';
import { useT } from '../../i18n';
import { concernKey, PLAN_CONCERNS, PlanConcern } from '../../plan';
import { useStore } from '../../store';
import { colors, fonts, radius, space, type } from '../../theme';

/** Describe your situation (optional free text + guided prompts). Drives the adaptive plan, on-device only. */
export default function PlanSituation() {
  const { data, setSituation } = useStore();
  const { t } = useT();
  const { toast } = useOverlay();
  const existing = data.situation;
  const [text, setText] = useState(existing?.text ?? '');
  const [concerns, setConcerns] = useState<PlanConcern[]>(existing?.concerns ?? []);

  const toggle = (c: PlanConcern) => setConcerns((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  const generate = () => {
    setSituation(concerns, text);
    toast(t('plan.updated'));
    router.navigate('/plan');
  };

  return (
    <Screen header={<SubHeader title={t('sit.title')} onBack={() => router.navigate('/plan')} />}>
      <PageTitle title={t('sit.title')} sub={t('sit.sub')} />
      <InfoBox body={t('sit.privacy')} />

      <Text style={type.label}>{t('sit.textLabel')}</Text>
      <NoteInput value={text} onChange={setText} placeholder={t('sit.textPh')} />

      <Text style={[type.label, { marginTop: space.sm }]}>{t('sit.pick')}</Text>
      <Text style={[type.body, { fontSize: 14 }]}>{t('sit.skipNote')}</Text>
      <View style={{ gap: space.sm }}>
        {PLAN_CONCERNS.map((c) => {
          const on = concerns.includes(c);
          return (
            <Pressable
              key={c}
              onPress={() => toggle(c)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.9 }]}
            >
              {on ? <CheckSquareIcon size={24} weight="fill" color={colors.primary} /> : <SquareIcon size={24} color={colors.checkOff} />}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.bodyInk}>{t(concernKey(c, 'label'))}</Text>
                <Text style={[type.body, { fontSize: 13, lineHeight: 18 }]}>{t(concernKey(c, 'desc'))}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton label={t('sit.generate')} onPress={generate} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowOn: { borderColor: colors.primary, backgroundColor: colors.lavenderSoft },
  label: { fontFamily: fonts.semibold },
});
