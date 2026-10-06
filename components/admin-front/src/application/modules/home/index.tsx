import PageNotFound from './pages/PageNotFound';
import HomePage from './pages/Home';
import NeedOnboardingPage from './pages/NeedOnboarding';

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
      isOnboarding: true,
      component: NeedOnboardingPage
    },
    {
      path: '*',
      component: PageNotFound
    }
  ]
};
