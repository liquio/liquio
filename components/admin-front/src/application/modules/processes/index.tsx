import ProcessesListPage from './pages/ProcessesList';
import UserProcessesListPage from './pages/UserProcessesList';
import ProcessesPage from './pages/Processes';

export default {
  routes: [
    {
      path: '/process/:processId',
      component: ProcessesPage,
      title: 'ProcessesPageTitle',
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.process.Process'
      }
    },
    {
      path: '/process',
      component: ProcessesListPage,
      title: 'ProcessesListPageTitle',
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.process.Process'
      }
    },
    {
      path: '/userProcess',
      component: UserProcessesListPage,
      title: 'UserProcessesListPageTitle',
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.process.UserProcesses'
      }
    }
  ]
};
