import MetricsPage from './pages/MetricsPage';
import ProcessesMetrics from './pages/ProcessesMetrics';

export default function getMetricsModule() {
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
    navigation: []
  };
}
