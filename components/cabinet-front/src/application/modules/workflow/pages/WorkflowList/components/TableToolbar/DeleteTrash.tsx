import React from 'react';
import { translate } from 'react-translate';
import { Button } from '@mui/material';

import ConfirmDialogRaw from 'components/ConfirmDialog';
import { ReactComponent as TrashIcon } from 'assets/img/trash_icon.svg';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface WorkflowRow {
  id: string | number;
  entryTaskId?: string | number;
  [key: string]: unknown;
}

interface DeleteTrashProps {
  rowsSelected: Array<string | number>;
  data: WorkflowRow[];
  t: (key: string) => string;
  actions: { onRowsDeletePermanent?: (ids: Array<string | number | undefined>) => Promise<unknown> };
}

const DeleteTrash = ({ t, data, rowsSelected, actions }: DeleteTrashProps) => {
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);

  const handleOpenConfirmDialog = React.useCallback(() => setOpenConfirmDialog(true), []);
  const handleCloseConfirmDialog = React.useCallback(() => setOpenConfirmDialog(false), []);

  const handleDelete = React.useCallback(async () => {
    const { onRowsDeletePermanent } = actions;

    if (onRowsDeletePermanent) {
      const entryTaskIdsToDelete = rowsSelected.map(
        (row) => (data.find(({ id }) => id === row) as WorkflowRow).entryTaskId
      );

      await onRowsDeletePermanent(entryTaskIdsToDelete);
    }

    handleCloseConfirmDialog();
  }, [actions, data, rowsSelected, handleCloseConfirmDialog]);

  return (
    <>
      <Button onClick={handleOpenConfirmDialog} startIcon={<TrashIcon />}>
        {t('DeleteTrash')}
      </Button>
      <ConfirmDialog
        fullScreen={false}
        open={openConfirmDialog}
        title={t('DeleteTrashConfirmation')}
        description={t('DeleteTrashConfirmationText')}
        handleClose={handleCloseConfirmDialog}
        handleConfirm={handleDelete}
      />
    </>
  );
};

export default translate('TrashListPage')(DeleteTrash as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
