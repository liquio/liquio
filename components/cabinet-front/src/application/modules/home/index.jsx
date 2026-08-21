import React from 'react';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import WorkspacePremiumOutlined from '@mui/icons-material/WorkspacePremiumOutlined';
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
  ],
  navigation: [
    {
      id: 'StartLearning',
      priority: 5,
      icon: <SchoolOutlined />,
      path: '/tasks/create/1000223/1000223001'
    },
    {
      id: 'MyCertificates',
      priority: 6,
      icon: <WorkspacePremiumOutlined />,
      path: '/my-certificates'
    }
  ]
};
