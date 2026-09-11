import React from 'react';

import ProfileAppbar from 'modules/profile/components/ProfileAppbar';

const UserProfile = React.lazy(() => import('./pages/UserProfile'));

export default {
  appbar: [
    {
      component: ProfileAppbar,
    },
  ],
  routes: [
    {
      path: '/profile',
      component: UserProfile,
      title: 'EditUserHeader',
    },
  ],
};
