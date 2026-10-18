import { LockSimpleIcon } from 'phosphor-react-native';

import { useT } from '../i18n';
import { Evidence, useStore } from '../store';
import { SheetHead, useOverlay } from './Overlay';
import { PrimaryButton, TonalButton } from './ui';

type Item = Evidence extends infer E ? (E extends unknown ? Omit<E, 'id' | 'savedAt'> : never) : never;

/** Saving to the Vault always asks first, then confirms with a toast. */
export function useConfirmSave() {
  const { saveEvidence } = useStore();
  const { openSheet, closeSheet, toast } = useOverlay();
  const { t } = useT();
  return (item: Item, opts?: { title?: string; body?: string; onSaved?: () => void }) =>
    openSheet(
      <>
        <SheetHead title={opts?.title ?? t('save.title')} body={opts?.body ?? t('save.body')} />
        <PrimaryButton
          icon={LockSimpleIcon}
          label={t('save.confirm')}
          onPress={() => {
            saveEvidence(item);
            closeSheet();
            toast(t('save.done'));
            opts?.onSaved?.();
          }}
        />
        <TonalButton label={t('common.cancel')} onPress={closeSheet} />
      </>,
    );
}

/** Save-to-Vault button with confirmation, disabled once saved. */
export function SaveToVaultButton({ item, saved }: { item: Item; saved: boolean }) {
  const { t } = useT();
  const confirm = useConfirmSave();
  return <PrimaryButton icon={LockSimpleIcon} label={saved ? t('common.savedToVault') : t('common.saveToVault')} disabled={saved} onPress={() => confirm(item)} />;
}
