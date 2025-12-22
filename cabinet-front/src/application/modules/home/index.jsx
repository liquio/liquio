import React from 'react';
import { generateUUID } from 'utils/uuid';

const HomePage = React.lazy(() => import('modules/home/pages/Home'));
const CustomInterface = React.lazy(() => import('modules/home/pages/CustomInterface'));

export default {
  routes: [
    {
      path: '/home',
      component: HomePage
    },
    {
      path: '/',
      component: HomePage
    },
    {
      path: '*',
      component: (props) => <CustomInterface {...props} key={generateUUID()} />
    }
  ]
};
