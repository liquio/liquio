import Settings from './pages/Settings';

export default {
  routes: [
    {
      path: '/settings',
      component: Settings,
      title: 'SettingsTitle',
      access: { unitHasAccessTo: 'modules.settings.Settings' }
    }
  ]
};
