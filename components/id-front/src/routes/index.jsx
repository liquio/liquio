import App from 'containers/App';
import PageNotFoundScreen from 'components/PageNotFoundScreen';
import Terms from 'containers/Terms';
import setId from 'helpers/setComponentsId';
import theme from 'themes';

const indexRoutes = [
  {
    path: '/authorise/govid',
    component: App,
    setId: setId('app'),
  },
  {
    path: '/id_gov_ua/callback',
    component: App,
    setId: setId('app'),
  },
  {
    path: '/totp',
    component: App,
    setId: setId('app'),
  },
  {
    path: '/reset-password',
    component: App,
    setId: setId('app'),
  },
  {
    path: '/',
    component: App,
    setId: setId('app'),
  },
  {
    path: '*',
    component: PageNotFoundScreen,
  },
];

if (!theme.hideTermsLink) {
  indexRoutes.unshift({
    path: '/terms',
    component: Terms,
    setId: setId('terms'),
  });
}

export default indexRoutes;
