import React from 'react';

const UserListPage = React.lazy(() => import('modules/users/pages/UserList'));

const access = {
  isUserUnitHead: true,
  unitHasAccessTo: ['navigation.users.list']
};

export default {
  routes: [
    {
      path: '/users',
      component: UserListPage,
      title: 'Users',
      access
    }
  ],
  navigation: [
    // {
    //   id: 'Users',
    //   path: '/users',
    //   icon: <AccessibilityNewOutlinedIcon />,
    //   priority: 30,
    //   access
    // }
  ]
};
