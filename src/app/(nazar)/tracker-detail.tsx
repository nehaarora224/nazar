import { router, useLocalSearchParams } from 'expo-router';
import { TrashIcon } from 'phosphor-react-native';
import { Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { TrackerResultCard as ResultCard } from '../../components/TrackerResultCard';
import { SaveToVaultButton } from '../../components/SaveToVault';
import { Card, ConfirmButton, InfoBox, SubHeader } from '../../components/ui';
import { TKey, useT } from '../../i18n';
import { useStore } from '../../store';
import { useView } from '../../view';
import { space, type } from '../../theme';

/** One recorded tracker check: what was recorded, why it was flagged, limits, what to do. */
export default function TrackerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteTrackerEntry } = useStore();
  const { t } = useT();
  const v = useView();
  const e = v.trackerEntries.find((x) => x.id === id);

  if (!e) {
    return (
      <Screen header={<SubHeader title={t('trk.title')} />}>
        <Text style={type.body}>{t('trk.d.notFound')}</Text>
      </Screen>
    );
  }

  const saved = v.isSaved('tracker', e.id);
  const flagged = e.result === 'tracker' || e.result === 'unknown';

  return (
    <Screen header={<SubHeader title={t('trk.title')} />}>
      <ResultCard entry={e} />
      <Section title={t('trk.d.info')}>
        <Text style={type.bodyInk}>{t(`trk.cls.${e.result}` as TKey)}</Text>
        {e.trackerType && <Text style={type.bodyInk}>{t(`trk.type.${e.trackerType}` as TKey)}</Text>}
        {e.note && <Text style={type.bodyInk}>“{e.note}”</Text>}
        <Text style={[type.body, { fontSize: 13 }]}>{t('trk.d.source')}</Text>
      </Section>
      <Section title={t('trk.d.why')}>
        <Text style={type.bodyInk}>{t(`trk.d.why.${e.result}` as TKey)}</Text>
      </Section>
      <InfoBox title={t('trk.limits')} body={t('trk.limitsBody')} />
      {flagged && (
        <>
          <Section title={t('trk.d.investigate')}>
            <Text style={[type.bodyInk, { lineHeight: 23 }]}>{t('trk.d.investigateBody')}</Text>
          </Section>
          <InfoBox kind="warn" title={t('trk.d.safety')} body={t('trk.d.safetyBody')} />
          {!e.sample && <SaveToVaultButton saved={saved} item={{ kind: 'tracker', refId: e.id, eventAt: e.at, result: e.result, trackerType: e.trackerType, note: e.note }} />}
        </>
      )}
      {e.sample ? (
        <InfoBox body={t('sample.readonly')} />
      ) : (
      <ConfirmButton
        icon={TrashIcon}
        label={t('trk.d.delete')}
        confirmLabel={t('trk.d.deleteConfirm')}
        onConfirm={() => {
          deleteTrackerEntry(e.id);
          router.navigate('/tracker');
        }}
      />
      )}
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
