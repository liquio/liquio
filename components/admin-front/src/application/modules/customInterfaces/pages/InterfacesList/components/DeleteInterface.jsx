import React from 'react';
import { translate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ConfirmDialog from 'components/ConfirmDialog';

const DeleteInterface = ({ t, value, onDelete, readOnly }) => {
  const [open, setOpen] = React.useState(false);

  const handleDelete = async () => {
    onDelete(value);
    setOpen(false);
  };

  if (readOnly) return null;

  return (
    <>
      <Tooltip title={t('Delete')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <DeleteIcon />
        </IconButton>
      </Tooltip>

      <ConfirmDialog
        open={open}
        title={t('DeletePrompt')}
        description={t('DeletePromtDescription', { name: value?.name })}
        handleClose={() => setOpen(false)}
        handleConfirm={handleDelete}
        darkTheme={true}
      />
    </>
  );
};

export default translate('InterfacesList')(DeleteInterface);
