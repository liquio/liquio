import React from 'react';
import { useTranslate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';

import ConfirmDialogRaw from 'components/ConfirmDialog';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface FavoriteRow {
  entity_name?: string;
  entity_id?: string;
  entity_type?: string;
  [key: string]: unknown;
}

interface DeleteFromFavoritesProps {
  row: FavoriteRow;
  handleDelete: (row: FavoriteRow) => void;
}

const DeleteFromFavorites = ({ row, handleDelete }: DeleteFromFavoritesProps) => {
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
