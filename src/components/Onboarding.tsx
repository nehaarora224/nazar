import { ShieldCheckIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '../i18n';
import { useStore } from '../store';
import { colors, fonts, radius } from '../theme';
import { NazarMark } from './Logo';

const PIN_RE = /^\d{4,12}$/;

/**
 * First-launch flow, shown as a FULL SCREEN (not an overlay) whenever no vault exists yet:
 * Welcome → Create PIN → Confirm. Rendering it as the only screen — rather than an absolute overlay
 * on top of the live calculator — is what makes every button and input reliably tappable on Android.
 *
 * On success it creates the encrypted vault (same crypto as before) and then LOCKS it, so the person
 * lands on the calculator/decoy and unlocks the Vault by entering the PIN they just chose.
 */
export function Onboarding() {
  const { createPin, lock } = useStore();
  const { t } = useT();
  const [step, setStep] = useState<'welcome' | 'pin'>('welcome');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  const submit = async () => {
    if (!PIN_RE.test(pin)) return setErr(t('pin.errLen'));
    if (pin !== confirm) return setErr(t('pin.errMatch'));
    setErr(undefined);
    setBusy(true);
    const res = await createPin(pin);
    if (res.ok) {
      // Lock the just-created vault so the flow ends on the calculator; the new PIN then unlocks it.
      lock();
      return; // this screen unmounts as status flips to 'locked'
    }
    setBusy(false);
    setErr(t('pin.errCreate'));
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
            <NazarMark size={60} variant="ghost" />

            {step === 'welcome' ? (
              <>
                <Text style={styles.title}>{t('onb.welcomeTitle')}</Text>
                <Text style={styles.sub}>{t('onb.welcomeBody')}</Text>
                <View style={styles.note}>
                  <ShieldCheckIcon size={18} color={colors.onPrimary} style={{ marginTop: 1 }} />
                  <Text style={styles.noteText}>{t('pin.note')}</Text>
                </View>
                <Pressable onPress={() => setStep('pin')} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.primaryText}>{t('onb.getStarted')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>{t('pin.createTitle')}</Text>
                <Text style={styles.sub}>{t('pin.createSub')}</Text>

                <View style={styles.form}>
                  <Text style={styles.label}>{t('pin.enter')}</Text>
                  <TextInput
                    value={pin}
                    onChangeText={(s) => setPin(s.replace(/\D/g, '').slice(0, 12))}
                    placeholder={t('pin.placeholder')}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={12}
                    autoFocus
                    accessibilityLabel={t('pin.enter')}
                    style={styles.input}
                  />
                  <Text style={styles.label}>{t('pin.confirm')}</Text>
                  <TextInput
                    value={confirm}
                    onChangeText={(s) => setConfirm(s.replace(/\D/g, '').slice(0, 12))}
                    placeholder={t('pin.placeholder')}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={12}
                    onSubmitEditing={submit}
                    accessibilityLabel={t('pin.confirm')}
                    style={styles.input}
                  />
                  {err ? (
                    <Text style={styles.err} accessibilityLiveRegion="polite">
                      {err}
                    </Text>
                  ) : null}

                  <Pressable onPress={submit} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.primary, (pressed || busy) && { opacity: 0.7 }]}>
                    <Text style={styles.primaryText}>{busy ? t('onb.creating') : t('pin.create')}</Text>
                  </Pressable>
                  <Pressable onPress={() => setStep('welcome')} disabled={busy} accessibilityRole="button" hitSlop={8} style={styles.cancel}>
                    <Text style={styles.cancelText}>{t('common.back')}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundImage: 'linear-gradient(160deg, #4B3FA0 0%, #2E2670 70%)', backgroundColor: colors.primary },
  flex: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 12 },
  title: { fontFamily: fonts.medium, fontSize: 24, letterSpacing: -0.24, color: colors.onPrimary, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.onPrimary, opacity: 0.85, textAlign: 'center', maxWidth: 340 },
  form: { alignSelf: 'stretch', maxWidth: 360, width: '100%', marginTop: 8, gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onPrimary, opacity: 0.9, marginTop: 6 },
  input: {
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    fontFamily: fonts.medium,
    fontSize: 20,
    letterSpacing: 4,
    color: colors.onPrimary,
  },
  err: { fontFamily: fonts.medium, fontSize: 14, color: '#FFD9D2', marginTop: 4 },
  note: { flexDirection: 'row', gap: 10, marginTop: 10, paddingHorizontal: 8, maxWidth: 360 },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.onPrimary, opacity: 0.85 },
  primary: { minHeight: 52, marginTop: 18, paddingHorizontal: 24, borderRadius: radius.md, backgroundColor: colors.onPrimary, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', maxWidth: 360 },
  primaryText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.primaryDeep },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancelText: { fontFamily: fonts.medium, fontSize: 15, color: colors.onPrimary, opacity: 0.85 },
});
