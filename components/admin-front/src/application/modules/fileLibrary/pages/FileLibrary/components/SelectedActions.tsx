import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface SelectedActionsProps {
  t: (key: string) => string;
  rowsSelected: unknown[];
  actions: { confirmDelete: (ids: unknown[]) => void };
}

const SelectedActions = ({ t, rowsSelected, actions }: SelectedActionsProps) =>
  rowsSelected.length ? (
    <Tooltip title={t('DeleteSelected')}>
      <IconButton onClick={() => actions.confirmDelete(rowsSelected)} size="large">
        <DeleteIcon />
      </IconButton>
    </Tooltip>
  ) : null;

export default SelectedActions;
