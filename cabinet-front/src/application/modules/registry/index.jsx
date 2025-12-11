import React from 'react';

import { ReactComponent as StorageOutlinedIcon } from 'assets/img/modulesIcons/storage-outlined.svg';
import RegistryPage from './pages/RegistryReforged';

export default {
  routes: [
    {
      path: '/registry',
      component: RegistryPage,
      access: { unitHasAccessTo: 'navigation.registry.RegistryPage' }
    }
  ],
  navigation: [
    {
      id: 'Registry',
      priority: 15,
      icon: <StorageOutlinedIcon />,
      path: '/registry',
      access: { unitHasAccessTo: 'navigation.registry.RegistryPage' }
    }
  ]
};
