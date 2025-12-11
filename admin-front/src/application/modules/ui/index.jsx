import React from 'react';
import WebIcon from '@mui/icons-material/Web';

import { getConfig } from 'core/helpers/configLoader';
import FilterListPage from './pages/FilterList';

export default function getEnableUIFilters() {
  const config = getConfig();

  if (!config.useUIFilters) {
    return {};
  }

  return {
    routes: [
      {
        path: '/ui/filters',
        component: FilterListPage,
        title: 'UIFilters',
        access: { unitHasAccessTo: 'navigation.ui' }
      },
      {
        path: '/ui',
        redirect: true,
        to: '/ui/filters'
      }
    ],
    navigation: [
      {
        id: 'UIFilters',
        icon: <WebIcon />,
        path: '/ui/filters',
        access: { unitHasAccessTo: 'navigation.ui' }
      }
    ]
  };
}
