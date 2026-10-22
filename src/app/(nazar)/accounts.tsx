import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  AppleLogoIcon,
  ChatCircleIcon,
  CloudIcon,
  DesktopIcon,
  DeviceMobileIcon,
  EnvelopeSimpleIcon,
  Icon,
  InstagramLogoIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Empty, InfoBox, ListCard, ListRow, PageTitle, PrimaryButton, SampleBanner, Stats, StatusLine, SubHeader, Tabs } from '../../components/ui';
import { ACCOUNT_CHECKS, checkKey, SECTIONS } from '../../content/accountChecks';
import { REVIEW_SERVICE_BY_ID, REVIEW_STATUS_META, serviceNameKey } from '../../content/reviewServices';
import { TKey, useT } from '../../i18n';
import { reviewAccountSummary } from '../../reviewAccounts';
import type { AccountKind, SampleSession, SampleSharing } from '../../sample';
import { AccountAnswer, useStore } from '../../store';
import { Tone } from '../../theme';
import { useView } from '../../view';

type Tab = 'accounts' | 'devices' | 'sharing' | 'checks';

const STATUS: Record<AccountAnswer['status'] | 'none', { t: Tone; key: TKey }> = {
  ok: { t: 'safe', key: 'acct.status.ok' },
  review: { t: 'look', key: 'acct.status.review' },
  skipped: { t: 'off', key: 'acct.status.skipped' },
  none: { t: 'off', key: 'acct.status.none' },
};
const KIND_ICON: Record<AccountKind, Icon> = { email: EnvelopeSimpleIcon, chat: ChatCircleIcon, social: InstagramLogoIcon, cloud: AppleLogoIcon };
const SESSION_TONE: Record<SampleSession['status'], Tone> = { unfamiliar: 'look', recognised: 'safe', current: 'safe' };
const SHARE_ICON: Record<SampleSharing['setting'], Icon> = { location: MapPinIcon, liveLocation: MapPinIcon, recovery: PhoneIcon, family: UsersThreeIcon };

/** Accounts & Sessions: accounts, devices and sessions, sharing settings, and the guided checks. */
export default function Accounts() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const { data } = useStore();
  const v = useView();
  const { t, when } = useT();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'accounts');
  // A link such as /accounts?tab=sharing opens that tab, once.
  useFocusEffect(
    useCallback(() => {
      if (!params.tab) return;
      setTab(params.tab);
      router.setParams({ tab: undefined });
    }, [params.tab]),
  );

  // User-added accounts to review (real, user-entered), kept separate from the labelled samples.
  const real = data.reviewAccounts;
  const raSum = reviewAccountSummary(real);

  // Devices and sessions she recorded during guided checks (real), plus labelled samples.
  const recorded = ACCOUNT_CHECKS.filter((c) => c.section !== 'sharing' && data.accountAnswers[c.id]?.status === 'review');
  const answers = ACCOUNT_CHECKS.map((c) => data.accountAnswers[c.id]);
  const done = answers.filter((a) => a && a.status !== 'skipped').length;
  const attention = raSum.attention + recorded.length + v.sessions.filter((s) => s.status === 'unfamiliar').length + v.sharing.filter((s) => s.status === 'review').length;
  const reviewed = raSum.reviewed + answers.filter((a) => a?.status === 'ok').length + v.sessions.filter((s) => s.status !== 'unfamiliar').length + v.sharing.filter((s) => s.status === 'ok').length;
  const firstOpen = ACCOUNT_CHECKS.findIndex((c) => !data.accountAnswers[c.id] || data.accountAnswers[c.id].status === 'skipped');
  const started = answers.some(Boolean);
  const startCheck = () =>
    router.navigate({ pathname: '/account-check', params: { start: String(firstOpen >= 0 && started ? firstOpen : 0), intro: started ? '0' : '1' } });
  const startLabel = !started ? t('acct.start') : firstOpen >= 0 ? t('acct.resume') : t('acct.again');

  const shareValue = (s: SampleSharing) =>
    s.value === 'off' ? t('acct.val.off') : s.value === 'none' ? t('acct.val.none') : s.value === '1 person' ? t('acct.val.onePerson') : s.value;

  return (
    <Screen header={<SubHeader title={t('acct.title')} />}>
      <PageTitle title={t('acct.title')} sub={t('acct.intro')} />
      <SampleBanner />
      <Stats
        items={[
          { label: t('acct.statAttention'), value: attention, t: attention ? 'look' : undefined },
          { label: t('acct.statReviewed'), value: reviewed, t: reviewed ? 'safe' : undefined },
          { label: t('acct.statTodo'), value: ACCOUNT_CHECKS.length - done },
        ]}
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { key: 'accounts', label: t('acct.tab.accounts') },
          { key: 'devices', label: t('acct.tab.devices') },
          { key: 'sharing', label: t('acct.tab.sharing') },
          { key: 'checks', label: t('acct.tab.checks') },
        ]}
      />

      {tab === 'accounts' && (
        <>
          <PrimaryButton icon={PlusIcon} label={t('racc.add')} onPress={() => router.navigate('/account-add')} />
          <ListCard title={t('racc.yours')} count={real.length}>
            {real.length === 0 ? (
              <Empty icon={UserCircleIcon} title={t('racc.emptyTitle')} body={t('racc.emptyBody')} />
            ) : (
              real.map((a, i) => {
                const m = REVIEW_STATUS_META[a.status];
                const name = a.service === 'custom' ? a.serviceName : t(serviceNameKey(a.service));
                return (
                  <ListRow
                    key={a.id}
                    first={i === 0}
                    icon={REVIEW_SERVICE_BY_ID[a.service].icon}
                    title={name}
                    status={<StatusLine t={m.tone} label={t(m.key)} />}
                    desc={a.label ? `${a.label} · ${t('common.recordedByYou')}` : t('common.recordedByYou')}
                    meta={when(a.updatedAt)}
                    onPress={() => router.navigate({ pathname: '/review-account', params: { id: a.id } })}
                  />
                );
              })
            )}
          </ListCard>

          {v.accounts.length > 0 && (
            <ListCard title={t('racc.examples')} count={v.accounts.length}>
              {v.accounts.map((a, i) => {
                const n = v.sessions.filter((s) => s.accountId === a.id).length;
                return (
                  <ListRow
                    key={a.id}
                    first={i === 0}
                    icon={KIND_ICON[a.kind]}
                    title={a.service}
                    status={<StatusLine t={a.status === 'review' ? 'look' : 'safe'} label={a.status === 'review' ? t('acct.needsAttention') : t('acct.reviewed')} sample={a.sample} />}
                    desc={`${a.account} · ${t(`acct.kind.${a.kind}` as TKey)}`}
                    meta={`${t(n === 1 ? 'acct.sessions_one' : 'acct.sessions_other', { n })} · ${t('acct.checkedAt', { when: when(a.checkedAt) })}`}
                    onPress={() => router.navigate({ pathname: '/session', params: { account: a.id } })}
                  />
                );
              })}
            </ListCard>
          )}
        </>
      )}

      {tab === 'devices' && (
        <ListCard title={t('acct.tab.devices')} count={recorded.length + v.sessions.length}>
          {recorded.length + v.sessions.length === 0 ? (
            <Empty icon={DeviceMobileIcon} title={t('acct.empty.devices')} body={t('acct.empty.body')} action={<PrimaryButton label={startLabel} onPress={startCheck} />} />
          ) : (
            <>
              {recorded.map((c, i) => {
                const a = data.accountAnswers[c.id];
                return (
                  <ListRow
                    key={c.id}
                    first={i === 0}
                    icon={DesktopIcon}
                    title={a.note || t(checkKey(c.id, 'title'))}
                    status={<StatusLine t="look" label={t('ses.unfamiliar')} />}
                    desc={`${c.service} · ${t('common.recordedByYou')}`}
                    meta={when(a.at)}
                    onPress={() => router.navigate({ pathname: '/account-item', params: { id: c.id } })}
                  />
                );
              })}
              {v.sessions.map((s, i) => (
                <ListRow
                  key={s.id}
                  first={recorded.length === 0 && i === 0}
                  icon={s.kind === 'device' ? (s.device.includes('Windows') || s.device.includes('Mac') ? DesktopIcon : DeviceMobileIcon) : ChatCircleIcon}
                  title={s.device}
                  status={<StatusLine t={SESSION_TONE[s.status]} label={t(`ses.${s.status}` as TKey)} sample={s.sample} />}
                  desc={`${s.service} · ${s.place}`}
                  meta={t('ses.lastActive', { when: when(s.lastActive) })}
                  onPress={() => router.navigate({ pathname: '/session', params: { id: s.id } })}
                />
              ))}
            </>
          )}
        </ListCard>
      )}

      {tab === 'sharing' && (
        <>
          <ListCard title={t('acct.tab.sharing')} count={v.sharing.length}>
            {v.sharing.length === 0 ? (
              <Empty icon={UsersThreeIcon} title={t('acct.empty.sharing')} body={t('acct.empty.sharingBody')} />
            ) : (
              v.sharing.map((s, i) => (
                <ListRow
                  key={s.id}
                  first={i === 0}
                  icon={SHARE_ICON[s.setting]}
                  title={t(`acct.share.${s.setting}` as TKey)}
                  status={<StatusLine t={s.status === 'review' ? 'look' : 'safe'} label={s.status === 'review' ? t('acct.needsAttention') : t('acct.reviewed')} sample={s.sample} />}
                  desc={`${s.service} · ${shareValue(s)}`}
                  onPress={() => router.navigate({ pathname: '/account-item', params: { id: s.checkId } })}
                />
              ))
            )}
          </ListCard>
          <InfoBox body={t('acct.sharingNote')} />
        </>
      )}

      {tab === 'checks' && (
        <>
          <PrimaryButton label={startLabel} onPress={startCheck} />
          <InfoBox body={t('acct.how')} />
          {SECTIONS.map((sec) => (
            <ListCard key={sec.id} title={t(sec.title)}>
              {ACCOUNT_CHECKS.filter((c) => c.section === sec.id).map((c, i) => {
                const a = data.accountAnswers[c.id];
                const st = STATUS[a?.status ?? 'none'];
                return (
                  <ListRow
                    key={c.id}
                    first={i === 0}
                    icon={c.section === 'linked' ? DeviceMobileIcon : c.section === 'sessions' ? CloudIcon : UsersThreeIcon}
                    title={t(checkKey(c.id, 'title'))}
                    status={<StatusLine t={st.t} label={t(st.key)} />}
                    desc={`${c.service} · ${t('acct.guided')}`}
                    meta={a ? when(a.at) : undefined}
                    onPress={() => router.navigate({ pathname: '/account-item', params: { id: c.id } })}
                  />
                );
              })}
            </ListCard>
          ))}
        </>
      )}
      <View />
    </Screen>
  );
}
