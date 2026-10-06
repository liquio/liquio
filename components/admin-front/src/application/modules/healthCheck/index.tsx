import HealthCheckList from './pages/HealthCheckList';

export default {
  routes: [
    {
      path: '/healthcheck',
      component: HealthCheckList,
      title: 'HealthCheckListTitle',
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.healthcheck.HealthCheckPage'
      }
    }
  ]
};
