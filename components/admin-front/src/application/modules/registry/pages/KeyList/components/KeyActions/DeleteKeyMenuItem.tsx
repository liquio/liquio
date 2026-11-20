import React from 'react';
import { translate } from 'react-translate';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import promiseChain from 'helpers/promiseChain';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface DeleteKeyMenuItemProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  registerId: string;
  registerKey: { id: string };
  actions: { deleteKey: (params: unknown) => Promise<unknown>; load: () => void };
  onClose: () => void;
}

const DeleteKeyMenuItem = ({
  t,
  registerId,
  registerKey,
  actions,
  onClose,
}: DeleteKeyMenuItemProps) => {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  return (
    <>
      <MenuItem
        onClick={() => {
          setOpen(true);
          onClose();
        }}
      >
        <ListItemIcon>
          <DeleteIcon />
        </ListItemIcon>
        <ListItemText primary={t('DeleteKey')} />
      </MenuItem>
      <ConfirmDialog
        open={open}
        darkTheme={true}
        title={t('DeletePrompt')}
        description={t('DeletePropmtDescription')}
        handleClose={() => setOpen(false)}
        handleConfirm={async () => {
          try {
            await promiseChain(
              [actions.deleteKey, actions.load, () => setOpen(false)] as never,
              { registerId, keyId: registerKey.id },
            );
          } catch (e) {
            setError(e as Error);
          }
        }}
      />
      <ConfirmDialog
        open={!!error}
        darkTheme={true}
        title={t('DeleteError')}
        description={t((error && error.message) as string)}
        handleClose={() => setError(null)}
      />
    </>
  );
};

export default translate('KeyListAdminPage')(DeleteKeyMenuItem as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
