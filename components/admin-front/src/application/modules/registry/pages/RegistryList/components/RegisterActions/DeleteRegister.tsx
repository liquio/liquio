import React from 'react';
import { translate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import promiseChain from 'helpers/promiseChain';
import DeleteIcon from 'assets/img/delete_icon.svg';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface RegisterItem {
  id: string;
  name?: string;
}

interface DeleteRegisterProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  register: RegisterItem;
  actions: { deleteRegister: (id: string) => Promise<unknown>; load: () => void };
}

const DeleteRegister = ({ t, register, actions }: DeleteRegisterProps) => {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  return (
    <>
      <Tooltip title={t('DeleteRegister')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <img src={DeleteIcon} alt="delete icon" width={20} />
        </IconButton>
      </Tooltip>

      <ConfirmDialog
        open={open}
        title={t('DeletePrompt', {
          register: register?.name,
        })}
        description={t('DeletePropmtDescription', {
          register: register?.name,
        })}
        handleClose={() => setOpen(false)}
        darkTheme={true}
        handleConfirm={async () => {
          try {
            await promiseChain(
              [actions.deleteRegister, actions.load, () => setOpen(false)] as never,
              register.id,
            );
          } catch (e) {
            setError(e as Error);
          }
        }}
      />
      <ConfirmDialog
        open={!!error}
        darkTheme={true}
        title={t('DeleteError', {
          deleting: register?.name + register?.id,
        })}
        description={t(error?.message as string)}
        handleClose={() => {
          setError(null);
          setOpen(false);
        }}
      />
    </>
  );
};

export default translate('RegistryListAdminPage')(DeleteRegister as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
