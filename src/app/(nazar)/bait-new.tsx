import { router, useFocusEffect } from 'expo-router';
import { CheckSquareIcon, DeviceMobileIcon, EnvelopeSimpleIcon, KeyIcon, ShieldCheckIcon, SquareIcon } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmailPreview, SendButton } from '../../components/BaitParts';
import { useOverlay } from '../../components/Overlay';
import { Screen } from '../../components/Screen';
import { Card, Choice, Field, InfoBox, PageTitle, PrimaryButton, SecondaryButton, SubHeader, TonalButton } from '../../components/ui';
import { sendBaitEmail } from '../../baitService';
import { TEMPLATES, tplKey } from '../../content/templates';
import { useT } from '../../i18n';
import { BaitType, TemplateId, useStore } from '../../store';
import { colors, fonts, radius, space, type } from '../../theme';

type Step = 'kind' | 'email' | 'preview' | 'd1' | 'd2' | 'd3' | 'd4';
const DECOYS: BaitType[] = ['history', 'menu'];
const TPL_ICON = { key: KeyIcon, shield: ShieldCheckIcon, envelope: EnvelopeSimpleIcon, device: DeviceMobileIcon };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Create a bait: choose email or calculator decoy, then that kind's steps. */
export default function BaitNew() {
  const { createBait, createEmailBait, setEmailSend, data } = useStore();
  const { toast } = useOverlay();
  const { t } = useT();
  const [step, setStep] = useState<Step>('kind');
  const [name, setName] = useState('');
  const [recipient, setRecipient] = useState('');
  const [own, setOwn] = useState(false);
  const [template, setTemplate] = useState<TemplateId>('password_setup');
  const [tried, setTried] = useState(false);
  const [decoy, setDecoy] = useState<BaitType>('history');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setStep('kind');
      setName('');
      setRecipient('');
      setOwn(false);
      setTemplate('password_setup');
      setTried(false);
      setDecoy('history');
      setBusy(false);
    }, []),
  );

  const back = () => {
    const prev: Partial<Record<Step, Step>> = { email: 'kind', preview: 'email', d1: 'kind', d2: 'd1', d3: 'd2', d4: 'd3' };
    if (prev[step]) setStep(prev[step]!);
    else router.navigate('/bait');
  };

  const emailOk = EMAIL_RE.test(recipient.trim());
  const formOk = !!name.trim() && emailOk && own;
  const errors = tried ? { name: !name.trim() ? t('be.nameRequired') : undefined, email: !emailOk ? t('be.badEmail') : undefined, own: !own } : {};

  /** Creates the bait record, then reports exactly what the email service did. */
  const finish = async (send: boolean) => {
    const id = createEmailBait(name.trim(), template, recipient.trim());
    if (!send) {
      toast(t('be.savedDraft'));
      router.replace({ pathname: '/bait-detail', params: { id } });
      return;
    }
    setBusy(true);
    setEmailSend(id, { status: 'sending' });
    const res = await sendBaitEmail({
      recipient: recipient.trim(),
      template,
      name: name.trim(),
      subject: t(tplKey(template, 'subject')),
      body: t(tplKey(template, 'body')),
      ownerSecret: data.ownerSecret,
    });
    if (res.ok) {
      setEmailSend(id, { status: 'sent', at: Date.now() }, res.remoteId);
      toast(t('be.sentOk'));
    } else {
      setEmailSend(id, { status: res.reason === 'unavailable' ? 'unavailable' : 'failed', at: Date.now(), error: res.error });
      toast(res.reason === 'unavailable' ? t('be.unavailableShort') : t('be.failedShort'));
    }
    setBusy(false);
    router.replace({ pathname: '/bait-detail', params: { id } });
  };

  const header = <SubHeader title={t('bn.title')} onBack={back} />;

  if (step === 'kind') {
    return (
      <Screen key={step} header={header}>
        <PageTitle title={t('bn.kind')} sub={t('bn.kindSub')} />
        <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
          <Choice icon={EnvelopeSimpleIcon} label={t('bn.kind.email')} desc={t('bn.kind.emailDesc')} onPress={() => setStep('email')} />
          <Choice icon={DeviceMobileIcon} label={t('bn.kind.decoy')} desc={t('bn.kind.decoyDesc')} onPress={() => setStep('d1')} />
        </View>
        <InfoBox title={t('bait.limits.title')} body={t('bait.limits.body')} />
      </Screen>
    );
  }

  if (step === 'email') {
    return (
      <Screen key={step} header={header}>
        <PageTitle kicker={t('bn.stepOf', { i: 1, n: 2 })} title={t('be.title')} sub={t('be.sub')} />
        <Field label={t('be.name')} value={name} onChange={setName} placeholder={t('be.namePh')} error={errors.name} />
        <Field
          label={t('be.recipient')}
          value={recipient}
          onChange={setRecipient}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          error={errors.email}
        />
        <Text style={[type.body, { fontSize: 14, marginTop: -8 }]}>{t('be.recipientHint')}</Text>
        <Pressable onPress={() => setOwn(!own)} accessibilityRole="checkbox" accessibilityState={{ checked: own }} style={[styles.check, errors.own && { borderColor: colors.act }]}>
          {own ? <CheckSquareIcon size={24} weight="fill" color={colors.primary} /> : <SquareIcon size={24} color={colors.checkOff} />}
          <Text style={[type.bodyInk, { flex: 1 }]}>{t('be.own')}</Text>
        </Pressable>
        {errors.own && <Text style={[type.pill, { color: colors.actFg, marginTop: -8 }]}>{t('be.needOwn')}</Text>}

        <Text style={[type.label, { marginTop: space.sm }]}>{t('be.template')}</Text>
        <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
          {TEMPLATES.map((tp) => (
            <Choice
              key={tp.id}
              icon={TPL_ICON[tp.icon]}
              label={t(tplKey(tp.id, 'name'))}
              desc={t(tplKey(tp.id, 'desc'))}
              selected={template === tp.id}
              onPress={() => setTemplate(tp.id)}
            />
          ))}
        </View>
        <InfoBox body={t('be.tplNote')} />
        <PrimaryButton
          label={t('be.toPreview')}
          onPress={() => {
            setTried(true);
            if (formOk) setStep('preview');
          }}
        />
      </Screen>
    );
  }

  if (step === 'preview') {
    return (
      <Screen key={step} header={header}>
        <PageTitle kicker={t('bn.stepOf', { i: 2, n: 2 })} title={t('be.previewTitle')} sub={t('be.previewSub', { name: name.trim() })} />
        <EmailPreview template={template} recipient={recipient.trim()} />
        <Card>
          <View style={{ gap: space.sm }}>
            <Text style={type.label}>{t('bn.observe')}</Text>
            <Text style={type.bodyInk}>{t('be.observeYes')}</Text>
            <Text style={type.bodyInk}>{t('be.observeNo')}</Text>
          </View>
        </Card>
        {busy ? (
          <PrimaryButton label={t('send.sending')} disabled />
        ) : (
          <SendButton label={t('be.send')} recipient={recipient.trim()} onConfirm={() => finish(true)} />
        )}
        <SecondaryButton label={t('be.saveOnly')} onPress={() => finish(false)} disabled={busy} />
        <TonalButton label={t('be.edit')} onPress={() => setStep('email')} />
      </Screen>
    );
  }

  // Calculator decoy steps (unchanged behaviour).
  const create = () => {
    const id = createBait(name.trim(), decoy);
    router.replace({ pathname: '/bait-detail', params: { id } });
  };
  return (
    <Screen key={step} header={header}>
      <Text style={type.overline}>{t('bn.step', { i: Number(step.slice(1)) })}</Text>
      {step === 'd1' && (
        <>
          <PageTitle title={t('bn.how')} sub={t('bn.howBody')} />
          <InfoBox title={t('bait.limits.title')} body={t('bait.limits.body')} />
          <PrimaryButton label={t('common.next')} onPress={() => setStep('d2')} />
        </>
      )}
      {step === 'd2' && (
        <>
          <PageTitle title={t('bn.choose')} />
          <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
            {DECOYS.map((k) => (
              <Choice key={k} label={t(`bait.type.${k}`)} desc={t(`bait.type.${k}.desc`)} selected={decoy === k} onPress={() => setDecoy(k)} />
            ))}
          </View>
          <PrimaryButton
            label={t('common.next')}
            onPress={() => {
              if (!name) setName(t(`bn.suggest.${decoy}`));
              setStep('d3');
            }}
          />
        </>
      )}
      {step === 'd3' && (
        <>
          <PageTitle title={t('bn.name')} sub={t('bn.nameHint')} />
          <TextInput value={name} onChangeText={setName} maxLength={40} accessibilityLabel={t('bn.name')} style={styles.input} autoFocus />
          {!name.trim() && <Text style={[type.pill, { color: colors.actFg }]}>{t('bn.nameRequired')}</Text>}
          <PrimaryButton label={t('common.next')} disabled={!name.trim()} onPress={() => setStep('d4')} />
        </>
      )}
      {step === 'd4' && (
        <>
          <PageTitle title={t('bn.observe')} />
          <Card>
            <View style={{ gap: space.sm }}>
              <Text style={type.label}>“{name.trim()}”</Text>
              <Text style={[type.body, { fontSize: 14 }]}>{t(`bait.type.${decoy}`)}</Text>
              <Text style={type.bodyInk}>{t('bn.observe.yes')}</Text>
              <Text style={type.bodyInk}>{t('bn.observe.no')}</Text>
              <Text style={type.bodyInk}>{`${t('bd.where')}: ${t(`bn.where.${decoy}`)}`}</Text>
            </View>
          </Card>
          <InfoBox kind="warn" body={t('bn.dontOpen')} />
          <PrimaryButton label={t('bn.create')} onPress={create} />
          <TonalButton label={t('common.back')} onPress={back} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  check: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
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
