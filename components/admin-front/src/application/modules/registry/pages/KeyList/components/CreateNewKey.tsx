import React from 'react';
import { translate } from 'react-translate';
import AddIcon from 'assets/icons/add_icon.svg';

import promiseChain from 'helpers/promiseChain';
import KeyFormModalRaw from './KeyFormModal';

const KeyFormModal = KeyFormModalRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface CreateNewKeyProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  actions: { createKey: (data: unknown) => Promise<unknown>; load: () => void };
  registerId: string;
  ColorButton: React.ComponentType<Record<string, unknown>>;
  loading?: boolean;
}

const CreateNewKey = ({ t, actions, registerId, ColorButton, loading }: CreateNewKeyProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <ColorButton
        variant="contained"
        color="primary"
        onClick={() => setOpen(true)}
        disabled={loading}
      >
        <img src={AddIcon} alt="DownloadIcon" />
        {t('CreateNew')}
      </ColorButton>

      <KeyFormModal
        open={open}
        newKey={true}
        registerId={registerId}
        onClose={() => setOpen(false)}
        onChange={(data: unknown) =>
          promiseChain([actions.createKey, actions.load] as never, data)
        }
      />
    </>
  );
};

export default translate('RegistryListAdminPage')(CreateNewKey as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
