import React from 'react';
import kibanaIcon from 'modules/elastic/assets/elastic-icon.svg';

import ElasticSettingsPage from './pages/ElasticSettings';
import ElasticMonitoring from './pages/Monitoring';

const access = { userHasUnit: [1000012] };

const iconStyle = {
  width: 18,
  marginLeft: 2,
  background: '#eee',
  borderRadius: 3
};

export default {
  routes: [
    {
      path: '/elastic/logs',
      component: ElasticSettingsPage,
      title: 'elasticSettings',
      access
    },
    {
      path: '/elastic/monitoring',
      component: ElasticMonitoring,
      title: 'elasticSettings',
      access
    }
  ],
  navigation: [
    {
      id: 'Elastic',
      icon: <img style={iconStyle} src={kibanaIcon} alt="elasticSettings" />,
      path: '/elastic/logs',
      access,
      children: [
        {
          id: 'Users',
          title: 'ProcessIndexElastic',
          path: '/elastic/logs',
          access
        },
        {
          id: 'Units',
          title: 'MonitoringElastic',
          path: '/elastic/monitoring',
          access
        }
      ]
    }
  ]
};
