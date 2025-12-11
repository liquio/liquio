import React from 'react';
import EqualizerIcon from '@mui/icons-material/Equalizer';

import MetricsPage from './pages/MetricsPage';
import ProcessesMetrics from './pages/ProcessesMetrics';
import { getConfig } from 'core/helpers/configLoader';

export default function getMetricsModule() {
  const config = getConfig();

  const navigation = [
    {
      id: 'HealthCheckListTitle',
      title: 'HealthCheckListTitle',
      path: '/healthcheck'
    },
    {
      id: 'StatisticsPage',
      title: 'StatisticsPageTitle',
      path: '/process-statistics',
      access: { userHasUnit: [1000003, 1000000043] }
    },
    {
      id: 'WorkflowDynamicsPage',
      title: 'WorkflowDynamicsPageTitle',
      path: '/workflow-dynamics',
      access: { userHasUnit: [1000003, 1000000043] }
    }
  ];

  if (config?.hideHealthcheck) {
    const healthcheckIndex = navigation.findIndex(
      (navigation) => navigation.id === 'HealthCheckListTitle'
    );
    healthcheckIndex !== -1 && navigation.splice(healthcheckIndex, 1);
  }

  return {
    routes: [
      {
        path: '/metrics',
        component: MetricsPage,
        title: 'MetricsIntegrationTitle',
        access: { userHasUnit: [1000003, 1000000043] }
      },
      {
        path: '/metrics/processes',
        component: ProcessesMetrics,
        title: 'MetricsProcessesTitle',
        access: { userHasUnit: [1000003, 1000000043] }
      },
    ],
    navigation: [
      {
        id: 'MetricsPage',
        title: 'MetricsPageTitle',
        icon: <EqualizerIcon />,
        access: { userHasUnit: [1000003, 1000000043] },
        children: navigation
      }
    ]
  };
}
