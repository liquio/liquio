import React from 'react';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const FileLibraryToolbar = ({ t, actions }) => (
  <>
    <Button startIcon={<AddIcon />} variant="outlined" onClick={actions.openFolderDialog}>
      {t('AddFolder')}
    </Button>
    <Button startIcon={<UploadFileIcon />} variant="contained" component="label">
      {t('UploadFiles')}
      <input hidden multiple type="file" onChange={actions.uploadFiles} />
    </Button>
  </>
);

export default FileLibraryToolbar;
