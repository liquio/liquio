import React from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';

import ReportListPage from 'application/modules/reports/pages/ReportList';
import { getConfig } from '../../../core/helpers/configLoader';

export default function getReportsModule() {
  const { reports: { enabled } = {} } = getConfig();

  return enabled
    ? {
        routes: [
          {
            path: '/reports',
            title: 'Reports',
            component: ReportListPage
          }
        ],
        navigation: [
          {
            id: 'Reports',
            icon: <AssessmentIcon />,
            path: '/reports'
          }
        ]
      }
    : {};
}
