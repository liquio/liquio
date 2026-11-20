import React from 'react';

import StorageIcon from '@mui/icons-material/Storage';

import RegistryListPage from './pages/RegistryList';
import KeyListPage from './pages/KeyList';

export default {
  routes: [
    {
      path: '/registry',
      component: RegistryListPage,
      title: 'RegisterList',
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.registry.Registry'
      }
    },
    {
      path: '/registry/:registerId',
      component: KeyListPage,
      title: 'KeyList',
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.registry.Registry'
      }
    }
  ],
  navigation: [
    {
      id: 'Registry',
      icon: <StorageIcon />,
      path: '/registry',
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.registry.Registry'
      }
    }
  ]
};
