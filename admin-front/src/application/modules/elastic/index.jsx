import ElasticSettingsPage from './pages/ElasticSettings';
import ElasticMonitoring from './pages/Monitoring';

const access = { userHasUnit: [1000012] };

export default {
  routes: [
    {
      path: '/elastic/logs',
      component: ElasticSettingsPage,
      title: 'elasticSettings',
      access
    },
    {
      path: '/elastic/monitoring',
      component: ElasticMonitoring,
      title: 'elasticSettings',
      access
    }
  ],
  navigation: []
};
