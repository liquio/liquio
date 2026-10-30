import React from 'react';
import LanguageIcon from '@mui/icons-material/Language';

import TranslationsPage from './pages/TranslationsPage';

export default {
  routes: [
    {
      path: '/languages',
      component: TranslationsPage,
      title: 'TranslationsPageTitle'
    }
  ],
  navigation: [
    {
      id: 'TranslationsPage',
      icon: <LanguageIcon />,
      title: 'TranslationsPageTitle',
      path: '/languages'
    }
  ]
};
