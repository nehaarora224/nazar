import { BluetoothIcon, EnvelopeSimpleIcon, FileLockIcon, Icon, PulseIcon, UserCircleIcon } from 'phosphor-react-native';

import type { TKey } from '../i18n/en';
import type { Evidence } from '../store';
import { checkKey } from './accountChecks';
import { tplKey } from './templates';

export const KIND_ICON: Record<Evidence['kind'], Icon> = {
  bait: FileLockIcon,
  link: EnvelopeSimpleIcon,
  tracker: BluetoothIcon,
  account: UserCircleIcon,
  quiet: PulseIcon,
};

export const SOURCE_KEY: Record<Evidence['kind'], TKey> = {
  bait: 'vault.source.bait',
  link: 'vault.source.link',
  tracker: 'vault.source.tracker',
  account: 'vault.source.account',
  quiet: 'vault.source.quiet',
};

type T = (k: TKey, p?: Record<string, string | number>) => string;

/** Title of an evidence record, in the current language. */
export function evidenceTitle(e: Evidence, t: T) {
  switch (e.kind) {
    case 'bait':
      return t('vault.row.bait', { name: e.baitName });
    case 'link':
      return t('vault.row.link', { name: e.baitName });
    case 'tracker':
      return t(`trk.cls.${e.result}` as TKey);
    case 'account':
      return t(checkKey(e.checkId, 'title'));
    case 'quiet':
      return t('vault.row.quiet', { area: t(`quiet.${e.area}` as TKey) });
  }
}

/** Supporting lines: what kind of record, plus whatever was noted at the time. */
export function evidenceDetail(e: Evidence, t: T, dur: (ms: number) => string) {
  switch (e.kind) {
    case 'bait':
      return [t(`bait.type.${e.baitType}`), e.durationMs ? t('bd.openFor', { d: dur(e.durationMs) }) : t('bd.noDur')];
    case 'link':
      return [t(tplKey(e.template, 'name')), e.detail ?? ''].filter(Boolean);
    case 'tracker':
      return [e.trackerType ? t(`trk.type.${e.trackerType}` as TKey) : '', e.note ? `“${e.note}”` : ''].filter(Boolean);
    default:
      return e.note ? [`“${e.note}”`] : [];
  }
}
