import { router, useLocalSearchParams } from 'expo-router';
import { ArrowSquareOutIcon, DesktopIcon, DeviceMobileIcon } from 'phosphor-react-native';
import { Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Card, InfoBox, ListCard, ListRow, PageTitle, PrimaryButton, SampleBadge, StatusLine, SubHeader } from '../../components/ui';
import { checkKey } from '../../content/accountChecks';
import { TKey, useT } from '../../i18n';
import { space, Tone, type } from '../../theme';
import { useView } from '../../view';

const TONE: Record<string, Tone> = { unfamiliar: 'look', recognised: 'safe', current: 'safe' };

/**
 * Detail for a (sample) account or device/session. Real device lists can't be read from
 * accounts, so these exist only as labelled samples; the guided check is how she records her own.
 */
export default function SessionDetail() {
  const { id, account } = useLocalSearchParams<{ id?: string; account?: string }>();
  const v = useView();
  const { t, when } = useT();
  const s = id ? v.sessions.find((x) => x.id === id) : undefined;
  const a = account ? v.accounts.find((x) => x.id === account) : s ? v.accounts.find((x) => x.id === s.accountId) : undefined;

  if (!s && !a) {
    return (
      <Screen header={<SubHeader title={t('acct.title')} />}>
        <Text style={type.body}>{t('ses.notFound')}</Text>
      </Screen>
    );
  }

  const checkId = s?.checkId ?? a!.checkId;
  const openCheck = () => router.navigate({ pathname: '/account-item', params: { id: checkId } });

  if (!s && a) {
    const sessions = v.sessions.filter((x) => x.accountId === a.id);
    return (
      <Screen header={<SubHeader title={t('acct.title')} />}>
        <PageTitle title={a.service} sub={`${a.account} · ${t(`acct.kind.${a.kind}` as TKey)}`} />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <StatusLine t={a.status === 'review' ? 'look' : 'safe'} label={a.status === 'review' ? t('acct.needsAttention') : t('acct.reviewed')} />
          {a.sample && <SampleBadge />}
        </View>
        {a.sample && <InfoBox body={t('sample.readonly')} />}
        <ListCard title={t('acct.tab.devices')} count={sessions.length}>
          {sessions.map((x, i) => (
            <ListRow
              key={x.id}
              first={i === 0}
              icon={x.device.includes('Windows') || x.device.includes('Mac') ? DesktopIcon : DeviceMobileIcon}
              title={x.device}
              status={<StatusLine t={TONE[x.status]} label={t(`ses.${x.status}` as TKey)} />}
              desc={x.place}
              meta={t('ses.lastActive', { when: when(x.lastActive) })}
              onPress={() => router.navigate({ pathname: '/session', params: { id: x.id } })}
            />
          ))}
        </ListCard>
        <PrimaryButton icon={ArrowSquareOutIcon} label={t('ses.openCheck')} onPress={openCheck} />
      </Screen>
    );
  }

  const x = s!;
  return (
    <Screen header={<SubHeader title={t('ses.title')} />}>
      <PageTitle title={x.device} sub={`${x.service}${a ? ` · ${a.account}` : ''}`} />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <StatusLine t={TONE[x.status]} label={t(`ses.${x.status}` as TKey)} />
        {x.sample && <SampleBadge />}
      </View>
      {x.sample && <InfoBox body={t('sample.readonly')} />}
      <Card>
        <View style={{ gap: space.md }}>
          <KV label={t('ses.device')} value={x.device} />
          <KV label={t('ses.place')} value={x.place} />
          <KV label={t('ses.lastActiveLabel')} value={when(x.lastActive)} />
          <KV label={t('item.service')} value={x.service} />
        </View>
      </Card>
      <Section title={t('item.why')} body={t(checkKey(checkId, 'why'))} />
      <Section title={t('item.unknown')} body={t('item.unknownBody')} />
      <Section title={t('item.next')} body={t(checkKey(checkId, 'next'))} />
      {x.status === 'unfamiliar' && <InfoBox kind="warn" title={t('item.alert')} body={t('item.alertBody')} />}
      <PrimaryButton icon={ArrowSquareOutIcon} label={t('ses.openCheck')} onPress={openCheck} />
    </Screen>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={type.overline}>{label}</Text>
      <Text style={type.bodyInk}>{value}</Text>
    </View>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <View style={{ gap: space.xs }}>
        <Text style={type.overline}>{title}</Text>
        <Text style={type.bodyInk}>{body}</Text>
      </View>
    </Card>
  );
}
