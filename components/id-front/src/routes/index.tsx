import type { JSXElementConstructor } from 'react';
import App from 'containers/App';
import PageNotFoundScreen from 'components/PageNotFoundScreen';
import Terms from 'containers/Terms';
import setId from 'helpers/setComponentsId';
import theme from 'themes';

// `src/App` spreads each entry onto `<Route exact>`. The routed components ignore the route props
// (`match`, `location`, `history`) and none of them requires props, so `JSXElementConstructor<never>` accepts them all.
interface IndexRoute {
  path: string;
  component: JSXElementConstructor<never>;
  setId?: (elementName: string) => string;
}

// The theme (bpmn) does not define this optional flag, but a theme may; widened by assignment.
const optionalTheme: typeof theme & { hideTermsLink?: boolean } = theme;

const indexRoutes: IndexRoute[] = [
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

if (!optionalTheme.hideTermsLink) {
  indexRoutes.unshift({
    path: '/terms',
    component: Terms,
    setId: setId('terms'),
  });
}

export default indexRoutes;
