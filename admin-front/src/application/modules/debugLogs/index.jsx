import React from 'react';
import BugReportIcon from '@mui/icons-material/BugReport';

import debugLogs from './pages/debugLogs';

const access = { userHasUnit: [1000014] };

export default {
  routes: [
    {
      path: '/debug-logs',
      component: debugLogs,
      title: 'DebugLogs',
      access
    }
  ],
  navigation: [
    {
      id: 'DebugLogs',
      icon: <BugReportIcon />,
      path: '/debug-logs',
      access
    }
  ]
};
