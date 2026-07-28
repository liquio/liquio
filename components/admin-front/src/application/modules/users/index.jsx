import React from 'react';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import UnitPage from './pages/Unit';

import UnitListPage from './pages/UnitList';
import UserListPage from './pages/UserList';
import UserProcessesListPage from './pages/UserProcessesList';
import UserAccessJournalPage from './pages/UserAccessJournal';
import UserLoginJournalPage from './pages/UserLoginJournal';
import UserOperations from './pages/UserOperations';

import { getConfig } from 'core/helpers/configLoader';

const getUsersModule = () => {
  const config = getConfig();

  return {
    routes: [
      {
        path: '/users/units/:unitId',
        component: UnitPage,
        title: 'Unit',
        access: {
          isUnitedUser: false,
          unitHasAccessTo: 'navigation.users.Units'
        }
      },
      {
        path: '/users/units',
        component: UnitListPage,
        title: 'UnitList',
        access: {
          isUnitedUser: false,
          unitHasAccessTo: 'navigation.users.Units'
        }
      },
      {
        path: '/users/systemUnits',
        component: UnitListPage,
        title: 'UnitList',
        access: {
          isUnitedUser: false,
          unitHasAccessTo: 'navigation.users.Units'
        }
      },
      {
        path: '/users/journal',
        component: UserProcessesListPage,
        title: 'UserProcessesListPageTitle',
        access: { isEnabled: config?.enabledUsersJournal }
      },
      {
        path: '/users/accessJournal',
        component: UserAccessJournalPage,
        title: 'UserAccessJournal',
        access: {
          isUnitedUser: false,
          unitHasAccessTo: 'navigation.users.UserAccessJournal'
        }
      },
      {
        path: '/users/loginJournal',
        component: UserLoginJournalPage,
        title: 'UserLoginJournal',
        access: {
          isUnitedUser: false,
          unitHasAccessTo: 'navigation.users.UserLoginJournal'
        }
      },
      {
        path: '/users/operations',
        component: UserOperations,
        title: 'UserOperations',
        access: {
          isUnitedUser: false,
          unitHasAccessTo: 'navigation.users.UserOperations'
        }
      },
      {
        path: '/users',
        component: UserListPage,
        title: 'UserList',
        access: {
          isUnitedUser: false,
          unitHasAccessTo: 'navigation.users.Users'
        }
      }
    ],
    navigation: [
      {
        id: 'Users',
        icon: <AccountCircleIcon />,
        path: '/users',
        access: {
          userHasUnit: [1000000, 1000001, 1000000041]
        },
        children: [
          {
            id: 'Users',
            title: 'UsersList',
            path: '/users',
            access: {
              isUnitedUser: false,
              unitHasAccessTo: 'navigation.users.Users'
            }
          },
          {
            id: 'Units',
            title: 'UnitListSystem',
            path: '/users/systemUnits',
            access: {
              isUnitedUser: false,
              unitHasAccessTo: 'navigation.users.Units'
            }
          },
          {
            id: 'Units',
            title: 'UnitListUsers',
            path: '/users/units',
            access: {
              isUnitedUser: false,
              unitHasAccessTo: 'navigation.users.Units'
            }
          }
        ]
      }
    ]
  };
};

export default getUsersModule;
