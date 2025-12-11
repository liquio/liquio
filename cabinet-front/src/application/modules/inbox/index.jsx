import InboxFilesPage from './pages/InboxFiles';
import InboxFilesListPage from './pages/InboxFilesList';
import InboxNavigation from './components/Navigation';

export default {
  routes: [
    {
      path: '/workflow/inbox/:inboxFileId',
      component: InboxFilesPage,
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.inbox.InboxFilesListPage'
      }
    },
    {
      path: '/workflow/inbox',
      title: 'InboxFilesTitle',
      component: InboxFilesListPage,
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.inbox.InboxFilesListPage'
      }
    }
  ],
  navigation: [
    {
      priority: 19,
      Component: InboxNavigation,
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.inbox.InboxFilesListPage'
      }
    }
  ]
};
