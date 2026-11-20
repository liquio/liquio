import React from 'react';
import { translate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';
import { GridActionsCellItem } from '@mui/x-data-grid';

import ConfirmDialogRaw from 'components/ConfirmDialog';
import { ReactComponent as DeleteIcon } from 'components/FileDataTable/assets/ic_delete.svg';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface UserRecord {
  [key: string]: unknown;
}

interface DeleteUserActionProps {
  t: (key: string) => string;
  user: UserRecord;
  handleDelete: (user: UserRecord) => Promise<unknown>;
  load: () => void;
  isDataTable?: boolean;
}

const DeleteUserAction = ({ t, user, handleDelete, load, isDataTable = false }: DeleteUserActionProps) => {
  const [open, setOpen] = React.useState(false);

  const handleConfirm = React.useCallback(async () => {
    setOpen(false);
    await handleDelete(user);
    load();
  }, [handleDelete, load, user]);

  const handleOpen = React.useCallback(() => setOpen(true), []);

  const handleClose = React.useCallback(() => setOpen(false), []);

  return (
    <>
      <Tooltip title={t('Delete')}>
        {isDataTable ? (
          <IconButton onClick={handleOpen} aria-label={t('Delete')}>
            <DeleteIcon />
          </IconButton>
        ) : (
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label={t('Delete')}
            aria-label={t('Delete')}
            onClick={handleOpen}
          />
        )}
      </Tooltip>

      <ConfirmDialog
        open={open}
        title={t('DeleteUser')}
        description={t('DeleteUserPrompt')}
        handleClose={handleClose}
        handleConfirm={handleConfirm}
      />
    </>
  );
};

export default translate('UserListPage')(DeleteUserAction as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
