import { router } from 'expo-router';
import { BluetoothIcon, GearSixIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useOverlay } from '../../components/Overlay';
import { Screen } from '../../components/Screen';
import { Card, InfoBox, ListCard, ListRow, NoteInput, PageTitle, PrimaryButton, SecondaryButton, SubHeader, TonalButton } from '../../components/ui';
import { TKey, useT } from '../../i18n';
import { useStore } from '../../store';
import { canOpenSystemSettings, openSystemSettings } from '../../systemSettings';
import { colors, space, type } from '../../theme';
import type { BleDevice } from '../../ble/types';
import { useBleScan } from '../../ble/useBleScan';

const ERROR_KEY: Record<string, TKey> = {
  unsupported: 'ble.err.unsupported',
  poweredOff: 'ble.err.poweredOff',
  unauthorized: 'ble.err.unauthorized',
  unknown: 'ble.err.unknown',
  denied: 'ble.err.denied',
  blocked: 'ble.err.blocked',
  scan_failed: 'ble.err.failed',
};

/** Real, time-limited Bluetooth scan. Results stay in memory unless a device is saved to the Vault. */
export default function BleScan() {
  const { supported, phase, error, devices, start, stop } = useBleScan();
  const { t, when } = useT();
  const { openSheet, closeSheet, toast } = useOverlay();
  const { saveEvidence } = useStore();

  const save = (d: BleDevice, note: string) => {
    saveEvidence({ kind: 'ble', refId: d.id, eventAt: d.lastSeen, name: d.name, rssi: d.rssi, note: note.trim() || undefined });
    closeSheet();
    toast(t('ble.saved'));
  };

  const inspect = (d: BleDevice) => openSheet(<SaveSheet d={d} onSave={save} onClose={closeSheet} />);

  return (
    <Screen header={<SubHeader title={t('ble.title')} onBack={() => router.navigate('/tracker')} />}>
      <PageTitle title={t('ble.title')} sub={t('ble.intro')} />

      {!supported ? (
        <InfoBox kind="warn" title={t('ble.needAppTitle')} body={t('ble.needApp')} />
      ) : (
        <>
          {phase === 'scanning' ? (
            <>
              <View style={styles.live}>
                <BluetoothIcon size={18} color={colors.primary} weight="fill" />
                <Text style={[type.bodyInk, { flex: 1 }]}>{t('ble.scanning')}</Text>
              </View>
              <SecondaryButton label={t('ble.stop')} onPress={stop} />
            </>
          ) : (
            <PrimaryButton icon={BluetoothIcon} label={phase === 'done' ? t('ble.rescan') : t('ble.start')} onPress={start} />
          )}

          {phase === 'error' && error && (
            <>
              <InfoBox kind="warn" body={t(ERROR_KEY[error] ?? 'ble.err.unknown')} />
              {canOpenSystemSettings && (error === 'blocked' || error === 'poweredOff') && (
                <SecondaryButton icon={GearSixIcon} label={t('trk.openSettings')} onPress={() => openSystemSettings('settings')} />
              )}
            </>
          )}

          {(phase === 'scanning' || phase === 'done') &&
            (devices.length === 0 ? (
              <Card>
                <Text style={type.body}>{phase === 'scanning' ? t('ble.searching') : t('ble.none')}</Text>
              </Card>
            ) : (
              <ListCard title={t('ble.found')} count={devices.length}>
                {devices.map((d, i) => (
                  <ListRow
                    key={d.id}
                    first={i === 0}
                    icon={BluetoothIcon}
                    title={d.name || t('ble.classify')}
                    desc={[d.manufacturerName, t('ble.sightings', { n: d.sightings }), d.rssi != null ? t('ble.rssi', { v: d.rssi }) : ''].filter(Boolean).join(' · ')}
                    meta={when(d.lastSeen)}
                    onPress={() => inspect(d)}
                  />
                ))}
              </ListCard>
            ))}
        </>
      )}

      <InfoBox title={t('ble.guideTitle')} body={t('ble.guide')} />
    </Screen>
  );
}

function SaveSheet({ d, onSave, onClose }: { d: BleDevice; onSave: (d: BleDevice, note: string) => void; onClose: () => void }) {
  const { t, when } = useT();
  const [note, setNote] = useState('');
  return (
    <View style={{ gap: space.sm }}>
      <Text style={type.title}>{d.name || t('ble.classify')}</Text>
      <Card>
        <View style={{ gap: 6 }}>
          <KV label={t('ble.id')} value={d.id} />
          {d.manufacturerName ? <KV label={t('ble.maker')} value={d.manufacturerName} /> : null}
          {d.rssi != null ? <KV label={t('ble.signal')} value={t('ble.rssi', { v: d.rssi })} /> : null}
          <KV label={t('ble.sightingsLabel')} value={String(d.sightings)} />
          <KV label={t('ble.first')} value={when(d.firstSeen)} />
          <KV label={t('ble.last')} value={when(d.lastSeen)} />
          {d.serviceUuids?.length ? <KV label={t('ble.services')} value={String(d.serviceUuids.length)} /> : null}
        </View>
      </Card>
      <NoteInput value={note} onChange={setNote} placeholder={t('ble.notePh')} />
      <PrimaryButton label={t('ble.save')} onPress={() => onSave(d, note)} />
      <TonalButton label={t('common.close')} onPress={onClose} />
    </View>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={type.overline}>{label}</Text>
      <Text style={[type.bodyInk, { fontSize: 14 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  live: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: colors.lavenderSoft },
});
