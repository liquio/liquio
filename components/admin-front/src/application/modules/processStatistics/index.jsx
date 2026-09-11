import StatisticsPage from './pages/StatisticsPage';
import WorkflowDynamicsPage from './pages/WorkflowDynamicsPage';

export default {
  routes: [
    {
      path: '/process-statistics',
      component: StatisticsPage,
      title: 'StatisticsPageTitle',
      access: { userHasUnit: [1000003, 1000000043] }
    },
    {
      path: '/workflow-dynamics',
      component: WorkflowDynamicsPage,
      title: 'WorkflowDynamicsPageTitle',
      access: { userHasUnit: [1000003, 1000000043] }
    }
  ]
};
