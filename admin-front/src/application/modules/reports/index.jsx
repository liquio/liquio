import React from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';

import ReportListPage from './pages/ReportList';
import ReportTemplatesPage from './pages/ReportTemplates';
import { getConfig } from 'core/helpers/configLoader';

export default function getReportsModule() {
  const { reports: { enabled } = {} } = getConfig();

  const access = {
    userHasUnit: [1000002, 1000000042]
  };

  return enabled
    ? {
        routes: [
          {
            path: '/reports',
            title: 'Reports',
            component: ReportListPage,
            access
          },
          {
            path: '/reports/templates',
            title: 'ReportTemplates',
            component: ReportTemplatesPage,
            access
          }
        ],
        navigation: [
          {
            id: 'Reports',
            icon: <AssessmentIcon />,
            path: '/reports',
            access,
            children: [
              {
                id: 'ReportList',
                title: 'List',
                path: '/reports'
              },
              {
                id: 'ReportTemplates',
                path: '/reports/templates'
              }
            ]
          }
        ]
      }
    : {};
}
