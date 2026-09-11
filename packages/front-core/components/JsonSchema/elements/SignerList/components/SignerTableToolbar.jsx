import React, { Fragment } from 'react';
import { IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/SaveOutlined';

const SignerTableToolbar = ({ editMode, actions }) => (
  <>
    <IconButton
      onClick={actions.toggleEditMode}
      aria-label={editMode ? 'Save' : 'Edit'}
    >
      {editMode ? <SaveIcon /> : <AddIcon />}
    </IconButton>
  </>
);

export default SignerTableToolbar;
