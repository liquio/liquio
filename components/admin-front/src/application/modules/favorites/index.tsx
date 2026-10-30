import React from 'react';
import StarBorderIcon from '@mui/icons-material/Star';

import FavoritesList from './pages/FavoritesList';

const favoritesModule = {
  routes: [
    {
      path: '/favorites',
      component: FavoritesList,
      title: 'FavoritesListTitle',
      access: {
        userHasUnit: [1000000042, 1000002, 1000000043, 1000003, 1000015, 100002, 100003]
      }
    }
  ],
  navigation: [
    {
      id: 'FavoritesListTitle',
      title: 'FavoritesListTitle',
      path: '/favorites',
      icon: <StarBorderIcon />,
      access: {
        userHasUnit: [1000000042, 1000002, 1000000043, 1000003, 1000015, 100002, 100003]
      }
    }
  ]
};

export default favoritesModule;
