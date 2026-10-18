import * as ImagePicker from 'expo-image-picker';
import { CheckCircleIcon, ImageIcon, MapPinIcon, WarningIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { parseExif } from '../exif';
import { readFileBytes } from '../exifReader';
import { useT } from '../i18n';
import { colors, fonts, radius, space, type } from '../theme';
import { InfoBox, PrimaryButton, SecondaryButton } from './ui';

export type PhotoResult = {
  uri: string;
  name: string;
  /** JPEG we could parse. */
  parsed: boolean;
  gps?: { lat: number; lon: number };
  dateTime?: string;
  camera?: string;
  fields: { key: string; value: string }[];
  error?: string;
};

/**
 * Lets the user choose their own photos and reads EXIF metadata locally. Nothing is uploaded:
 * the bytes are read on the device and parsed in memory. GPS, capture time and camera model are
 * the only fields surfaced. Handles permission denial, non-JPEG, stripped and unreadable files.
 */
export function PhotoAudit({ onGpsFound }: { onGpsFound: (count: number, sample: string) => void }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<PhotoResult[] | null>(null);
  const [denied, setDenied] = useState(false);

  const pick = async () => {
    setDenied(false);
    // Native needs library permission; web uses a file dialog and needs none.
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setDenied(true);
        return;
      }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 1, // don't re-encode, so original EXIF survives
      exif: true,
    });
    if (res.canceled) return;
    setBusy(true);
    const out: PhotoResult[] = [];
    for (const asset of res.assets) {
      const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'photo.jpg';
      try {
        const bytes = await readFileBytes(asset.uri);
        const exif = parseExif(bytes);
        // Fall back to the picker's own EXIF for GPS if our parser saw a re-encoded copy.
        let gps = exif.gps;
        if (!gps && asset.exif && typeof asset.exif.GPSLatitude === 'number' && typeof asset.exif.GPSLongitude === 'number') {
          const lat = asset.exif.GPSLatitude * (asset.exif.GPSLatitudeRef === 'S' ? -1 : 1);
          const lon = asset.exif.GPSLongitude * (asset.exif.GPSLongitudeRef === 'W' ? -1 : 1);
          gps = { lat, lon };
        }
        out.push({
          uri: asset.uri,
          name,
          parsed: exif.parsed,
          gps,
          dateTime: exif.dateTimeOriginal,
          camera: exif.make || exif.model ? [exif.make, exif.model].filter(Boolean).join(' ') : undefined,
          fields: exif.fields,
        });
      } catch (e) {
        out.push({ uri: asset.uri, name, parsed: false, fields: [], error: e instanceof Error ? e.message : String(e) });
      }
    }
    setResults(out);
    setBusy(false);
    const withGps = out.filter((r) => r.gps);
    if (withGps.length) onGpsFound(withGps.length, `${withGps[0].name} · ${withGps[0].gps!.lat.toFixed(4)}, ${withGps[0].gps!.lon.toFixed(4)}`);
  };

  return (
    <View style={{ gap: space.md }}>
      <InfoBox body={t('photo.localNote')} />
      {denied && <InfoBox kind="warn" body={t('photo.denied')} />}
      <PrimaryButton icon={ImageIcon} label={busy ? t('photo.reading') : results ? t('photo.pickMore') : t('photo.pick')} onPress={pick} disabled={busy} />

      {results && results.length === 0 && <Text style={type.body}>{t('photo.none')}</Text>}
      {results?.map((r, i) => (
        <View key={`${r.uri}-${i}`} style={styles.row}>
          <View style={styles.head}>
            {r.gps ? <MapPinIcon size={18} color={colors.actFg} weight="fill" /> : r.parsed ? <CheckCircleIcon size={18} color={colors.safe} /> : <WarningIcon size={18} color={colors.lookFg} />}
            <Text style={[type.label, { flex: 1, fontSize: 15 }]} numberOfLines={1}>
              {r.name}
            </Text>
          </View>
          {r.error ? (
            <Text style={type.body}>{t('photo.unreadable')}</Text>
          ) : !r.parsed ? (
            <Text style={type.body}>{t('photo.notJpeg')}</Text>
          ) : r.fields.length === 0 ? (
            <Text style={type.body}>{t('photo.stripped')}</Text>
          ) : (
            <View style={{ gap: 2 }}>
              {r.gps && <Meta label={t('photo.gps')} value={`${r.gps.lat.toFixed(5)}, ${r.gps.lon.toFixed(5)}`} alert />}
              {r.dateTime && <Meta label={t('photo.taken')} value={r.dateTime} />}
              {r.camera && <Meta label={t('photo.camera')} value={r.camera} />}
            </View>
          )}
        </View>
      ))}
      {results && <SecondaryButton label={t('photo.clear')} onPress={() => setResults(null)} />}
    </View>
  );
}

function Meta({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <Text style={[type.bodyInk, { fontSize: 14 }]}>
      <Text style={{ fontFamily: fonts.semibold, color: alert ? colors.actFg : colors.ink }}>{label}: </Text>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
