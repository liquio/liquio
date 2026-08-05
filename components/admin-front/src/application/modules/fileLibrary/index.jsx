import React from 'react';
import FolderIcon from '@mui/icons-material/Folder';

import FileLibraryPage from './pages/FileLibrary';

const access = {
  userHasUnit: [1000000, 1000001, 1000000041, 1000014]
};

export default {
  routes: [
    {
      path: '/file-library/folder/:folderPath(.+)',
      component: FileLibraryPage,
      title: 'FileLibrary',
      access
    },
    {
      path: '/file-library',
      component: FileLibraryPage,
      title: 'FileLibrary',
      access
    }
  ],
  navigation: [
    {
      id: 'FileLibrary',
      icon: <FolderIcon />,
      path: '/file-library',
      access
    }
  ]
};
