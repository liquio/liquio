import React from 'react';
import WebIcon from '@mui/icons-material/Web';

import { getConfig } from 'core/helpers/configLoader';
import FilterListPage from './pages/FilterList';

interface RouteDef {
  path: string;
  component?: unknown;
  redirect?: boolean;
  to?: string;
  title?: string;
  access?: Record<string, unknown>;
  [key: string]: unknown;
}

interface NavDef {
  id: string;
  icon: React.ReactNode;
  path: string;
  access?: Record<string, unknown>;
}

interface UIModule {
  routes?: RouteDef[];
  navigation?: NavDef[];
  [key: string]: unknown;
}

export default function getEnableUIFilters(): UIModule {
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
