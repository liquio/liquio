import React from 'react';
import { translate } from 'react-translate';
import { Tooltip, IconButton, CircularProgress } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutline';

import ConfirmDialog from 'components/ConfirmDialog';
import promiseChain from 'helpers/promiseChain';
import theme from 'theme';
import { ReactComponent as DeleteIcon } from '../assets/ic_delete.svg';

const DeleteAllButton = (props) => {
  const { t, loading, actions, rowsSelected, data } = props;

  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);

  const alternativeIcons = theme?.fileDataTableTypePremium;

  const handleDelete = React.useCallback(async () => {
    setOpenConfirmDialog(false);

    const files = data.filter(({ id }) => rowsSelected.includes(id));
    await promiseChain(files.map((file) => () => actions.handleDeleteFile(file)));
    actions.onRowsSelect([]);
  }, [actions, data, rowsSelected]);

  return (
    <>
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <Tooltip title={t('DeleteFile')}>
          <IconButton onClick={() => setOpenConfirmDialog(true)} aria-label={t('DeleteFile')}>
            {alternativeIcons ? <DeleteIcon /> : <DeleteOutlinedIcon />}
          </IconButton>
        </Tooltip>
      )}

      <ConfirmDialog
        fullScreen={false}
        t={t}
        open={openConfirmDialog}
        acceptButtonText={t('Delete')}
        title={t('DeleteRecordConfirmation')}
        description={t('DeleteRecordConfirmationText')}
        handleClose={() => setOpenConfirmDialog(false)}
        handleConfirm={handleDelete}
      />
    </>
  );
};

export default translate('WorkflowPage')(DeleteAllButton);
