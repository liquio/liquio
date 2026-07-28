import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { Button } from '@mui/material';

import ConfirmDialog from 'components/ConfirmDialog';
import { ReactComponent as TrashIcon } from 'assets/img/trash_icon.svg';

const DeleteTrash = ({ t, data, rowsSelected, actions }) => {
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);

  const handleOpenConfirmDialog = React.useCallback(() => setOpenConfirmDialog(true), []);
  const handleCloseConfirmDialog = React.useCallback(() => setOpenConfirmDialog(false), []);

  const handleDelete = React.useCallback(async () => {
    const { onRowsDeletePermanent } = actions;

    if (onRowsDeletePermanent) {
      const entryTaskIdsToDelete = rowsSelected.map(
        (row) => data.find(({ id }) => id === row).entryTaskId
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

DeleteTrash.propTypes = {
  rowsSelected: PropTypes.array.isRequired,
  data: PropTypes.array.isRequired,
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired
};

export default translate('TrashListPage')(DeleteTrash);
