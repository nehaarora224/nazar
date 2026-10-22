import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { CameraSlashIcon, TrashIcon } from 'phosphor-react-native';
import { Image, Platform, StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Card, ConfirmButton, Empty, InfoBox, PageTitle, SecondaryButton, SubHeader } from '../../components/ui';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { colors, radius, space, type } from '../../theme';

const isAndroid = Platform.OS === 'android';

/**
 * Set up and review the intruder-capture feature: after repeated wrong-PIN attempts, a front-camera
 * photo is taken and saved to the Vault. Native Android only; on every other platform it is honestly
 * marked unavailable (the camera never runs there).
 */
export default function Intruder() {
  const { data, setIntruderCaptureOn, removeIntruderCapture } = useStore();
  const { t, when } = useT();
  const [perm, requestPerm] = useCameraPermissions();
  const on = data.intruderCaptureOn;
  const captures = [...data.intruderCaptures].sort((a, b) => b.at - a.at);
  const needsPerm = isAndroid && on && !perm?.granted;

  const toggle = async (next: boolean) => {
    if (next && isAndroid && !perm?.granted) {
      const res = await requestPerm();
      // Turn on regardless so the choice persists; capture simply won't run until permission is granted.
      setIntruderCaptureOn(true);
      void res;
      return;
    }
    setIntruderCaptureOn(next);
  };

  return (
    <Screen header={<SubHeader title={t('ic.title')} onBack={() => (router.canGoBack() ? router.back() : router.navigate('/bait'))} />}>
      <PageTitle title={t('ic.title')} sub={t('ic.sub')} />

      {!isAndroid && <InfoBox kind="warn" body={t('ic.webOnly')} />}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, width: '100%' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.label}>{t('ic.toggle')}</Text>
            <Text style={[type.body, { fontSize: 13 }]}>{on ? t('ic.on') : t('ic.off')}</Text>
          </View>
          <Switch
            value={on}
            onValueChange={toggle}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.surface}
            accessibilityLabel={t('ic.toggle')}
          />
        </View>
      </Card>

      {needsPerm && (
        <InfoBox kind="warn" title={t('ic.needCamera')} body={perm?.canAskAgain === false ? t('ic.denied') : undefined}>
          {perm?.canAskAgain !== false && <SecondaryButton label={perm?.granted ? t('ic.granted') : t('ic.grant')} onPress={requestPerm} style={{ marginTop: 8 }} />}
        </InfoBox>
      )}

      <InfoBox body={t('ic.how')} />
      <InfoBox kind="warn" body={t('ic.limits')} />

      <Text style={type.overline}>{t('ic.capturesTitle')}</Text>
      {captures.length === 0 ? (
        <Empty icon={CameraSlashIcon} title={t('ic.empty')} body={t('ic.emptyBody')} />
      ) : (
        <View style={{ gap: space.md }}>
          {captures.map((c) => (
            <Card key={c.id}>
              <View style={{ gap: space.sm, width: '100%' }}>
                <Image source={{ uri: c.photo.dataUrl }} style={styles.photo} resizeMode="cover" accessibilityLabel={t('ic.title')} />
                <Text style={type.label}>{when(c.at)}</Text>
                <Text style={[type.body, { fontSize: 13 }]}>{t('ic.attempts', { n: c.attempts })}</Text>
                <ConfirmButton icon={TrashIcon} label={t('ic.remove')} confirmLabel={t('vault.removeConfirm')} onConfirm={() => removeIntruderCapture(c.id)} />
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', height: 240, borderRadius: radius.md, backgroundColor: colors.offBg },
});
