import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const SelectedActions = ({ t, rowsSelected, actions }) =>
  rowsSelected.length ? (
    <Tooltip title={t('DeleteSelected')}>
      <IconButton onClick={() => actions.confirmDelete(rowsSelected)} size="large">
        <DeleteIcon />
      </IconButton>
    </Tooltip>
  ) : null;

export default SelectedActions;
