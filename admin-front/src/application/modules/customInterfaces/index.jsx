import React from 'react';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

import InterfacesListPage from 'application/modules/customInterfaces/pages/InterfacesList';
import { getConfig } from '../../../core/helpers/configLoader';

export default function getCustomInterfaces() {
  const config = getConfig();

  const access = {
    userHasUnit: [1000002, 1000000042]
  };

  let customInterfaces = {
    routes: [
      {
        path: '/customInterfaces',
        component: InterfacesListPage,
        title: 'CustomInterfaces',
        access
      }
    ],
    navigation: [
      {
        id: 'CustomInterfaces',
        icon: <AddPhotoAlternateIcon />,
        path: '/customInterfaces',
        access
      }
    ]
  };

  if (!config.customInterfaces) {
    customInterfaces = {};
  }

  return customInterfaces;
}
