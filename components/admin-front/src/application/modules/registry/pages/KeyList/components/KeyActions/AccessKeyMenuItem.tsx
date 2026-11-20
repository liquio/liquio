import React from 'react';
import { translate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';
import promiseChain from 'helpers/promiseChain';
import AccessFormModalRaw from '../AccessFormModal';
import groupIcon from 'assets/icons/clarity_group-solid.svg';

const AccessFormModal = AccessFormModalRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface AccessKeyMenuItemProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  registerKey: unknown;
  registerId: string;
  onClose?: () => void;
  actions: { saveKey: (data: unknown) => Promise<unknown>; load: () => void };
}

const EditKeyMenuItem = ({
  t,
  registerKey,
  registerId,
  onClose = () => null,
  actions,
}: AccessKeyMenuItemProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip title={t('Access')}>
        <IconButton
          onClick={() => {
            setOpen(true);
            onClose();
          }}
        >
          <img src={groupIcon} alt="people icon" />
        </IconButton>
      </Tooltip>
      {open ? (
        <AccessFormModal
          value={registerKey}
          registerId={registerId}
          onClose={() => setOpen(false)}
          onChange={(data: unknown) =>
            promiseChain([actions.saveKey, actions.load] as never, data)
          }
        />
      ) : null}
    </>
  );
};

export default translate('KeyListAdminPage')(EditKeyMenuItem as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
