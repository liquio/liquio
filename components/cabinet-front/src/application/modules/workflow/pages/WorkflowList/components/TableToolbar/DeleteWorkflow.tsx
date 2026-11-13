import React from 'react';
import { translate } from 'react-translate';
import { Button } from '@mui/material';
import { connect } from 'react-redux';

import ConfirmDialogRaw from 'components/ConfirmDialog';
import { ReactComponent as TrashIcon } from 'assets/img/trash_icon.svg';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface WorkflowRow {
  id: string | number;
  entryTaskId?: string | number;
  [key: string]: unknown;
}

interface Unit {
  menuConfig?: { navigation?: { workflow?: { Trash?: boolean } } };
  [key: string]: unknown;
}

interface DeleteWorkflowProps {
  t: (key: string) => string;
  data: WorkflowRow[];
  rowsSelected: Array<string | number>;
  actions: { onRowsDelete?: (ids: Array<string | number>) => Promise<unknown> };
  userUnits: Unit[];
}

const DeleteWorkflow = ({ t, data, rowsSelected, actions: { onRowsDelete }, userUnits }: DeleteWorkflowProps) => {
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);

  const handleOpenConfirmDialog = () => setOpenConfirmDialog(true);

  const handleCloseConfirmDialog = () => setOpenConfirmDialog(false);

  const handleDelete = async () => {
    onRowsDelete &&
      (await onRowsDelete(
        rowsSelected
          .map((row) => (data.find(({ id }) => id === row) || {} as WorkflowRow).entryTaskId as string | number)
          .filter(Boolean)
      ));
    handleCloseConfirmDialog();
  };

  const multipleRows = !!(rowsSelected && rowsSelected.length > 1);
  const title = t(
    multipleRows ? 'DeleteWorkflowConfirmationMultiple' : 'DeleteWorkflowConfirmation'
  );

  const isTrash = userUnits.find(
    ({ menuConfig }) => menuConfig?.navigation?.workflow?.Trash === true
  );

  return (
    <>
      <Button onClick={handleOpenConfirmDialog} startIcon={<TrashIcon />}>
        {t('DeleteWorkflow')}
      </Button>
      <ConfirmDialog
        fullScreen={false}
        open={openConfirmDialog}
        title={title}
        description={isTrash ? t('DeleteWorkflowConfirmationText') : null}
        handleClose={handleCloseConfirmDialog}
        handleConfirm={handleDelete}
      />
    </>
  );
};

const mapStateToProps = ({ auth: { userUnits } }: { auth: { userUnits: Unit[] } }) => ({ userUnits });

const translated = translate('WorkflowListPage')(DeleteWorkflow as never);
export default connect(mapStateToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
