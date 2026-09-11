import React from 'react';
import { translate } from 'react-translate';
import { Button } from '@mui/material';
import { connect } from 'react-redux';

import ConfirmDialog from 'components/ConfirmDialog';
import { ReactComponent as TrashIcon } from 'assets/img/trash_icon.svg';

const DeleteWorkflow = ({ t, data, rowsSelected, actions: { onRowsDelete }, userUnits }) => {
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);

  const handleOpenConfirmDialog = () => setOpenConfirmDialog(true);

  const handleCloseConfirmDialog = () => setOpenConfirmDialog(false);

  const handleDelete = async () => {
    onRowsDelete &&
      (await onRowsDelete(
        rowsSelected
          .map((row) => (data.find(({ id }) => id === row) || {}).entryTaskId)
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

const mapStateToProps = ({ auth: { userUnits } }) => ({ userUnits });

const translated = translate('WorkflowListPage')(DeleteWorkflow);
export default connect(mapStateToProps)(translated);
