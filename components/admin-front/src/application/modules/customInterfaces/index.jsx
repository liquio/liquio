import React from 'react';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

import InterfacesListPage from 'application/modules/customInterfaces/pages/InterfacesList';
import { getConfig } from 'core/helpers/configLoader';
import CabinetMenuPage from './pages/CabinetMenu';

export default function getCustomInterfaces() {
  const config = getConfig();

  const access = {
    userHasUnit: [1000002, 1000000042]
  };
  const cabinetMenuAccess = { userHasUnit: [1000002, 1000000042] };
  const cabinetMenuPageEnabled = config?.features?.cabinetMenuPageEnabled === true;

  let customInterfaces = {
    routes: [
      {
        path: '/customInterfaces',
        component: InterfacesListPage,
        title: 'CustomInterfaces',
        access
      }
    ].concat(
      cabinetMenuPageEnabled
        ? [
            {
              id: 'CabinetMenu',
              component: CabinetMenuPage,
              path: '/cabinet-menu',
              access: cabinetMenuAccess
            }
          ]
        : []
    ),
    navigation: [
      {
        id: 'CustomInterfacesGroup',
        title: 'CustomInterfaces',
        icon: <AddPhotoAlternateIcon />,
        access,
        children: [
          {
            title: 'CustomInterfaces',
            path: '/customInterfaces',
            access
          }
        ].concat(
          cabinetMenuPageEnabled
            ? [
                {
                  title: 'CabinetMenu',
                  path: '/cabinet-menu',
                  access: cabinetMenuAccess
                }
              ]
            : []
        )
      }
    ]
  };

  if (!config.customInterfaces) {
    customInterfaces = {};
  }

  return customInterfaces;
}
