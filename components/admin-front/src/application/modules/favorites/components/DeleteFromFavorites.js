import React from 'react';
import { useTranslate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';

import ConfirmDialog from 'components/ConfirmDialog';

const DeleteFromFavorites = ({ row, handleDelete }) => {
  const t = useTranslate('FavoritesPage');
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip title={t('Delete')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <DeleteIcon />
        </IconButton>
      </Tooltip>
      <ConfirmDialog
        open={open}
        darkTheme={true}
        title={t('DeletePrompt')}
        description={t('DeletePromtDescription', {
          title: row?.entity_name
        })}
        handleClose={() => setOpen(false)}
        handleConfirm={() => {
          handleDelete(row);
          setOpen(false);
        }}
      />
    </>
  );
};

export default DeleteFromFavorites;
