import ElasticMonitoring from './pages/Monitoring';

const access = { userHasUnit: [1000012] };

export default {
  routes: [
    {
      path: '/elastic/monitoring',
      component: ElasticMonitoring,
      title: 'elasticSettings',
      access
    }
  ],
  navigation: []
};
