import type { ConfigDefaults } from 'core/types/config';

const defaults = {
  application: {
    name: 'Administration Panel',
    environment: 'development',
    type: 'adminpanel'
  },
  customers: [
    {
      id: 1,
      name: 'bpmn'
    }
  ],
  registry: {
    useReindex: false,
    useAfterhandlersReindex: false
  },
  reports: {
    enabled: false
  },
  useUIFilters: false,
  customInterfaces: false,
  features: {
    cabinetMenuPageEnabled: false,
    navigationTreePreloading: false
  },
  plugins: [],
  backendUrl: 'http://admin-api.liquio.local',
  authLink: 'http://admin-api.liquio.local/redirect/auth',
  adminPanelUrl: 'http://admin.liquio.local',
  cabinetUrl: 'http://cabinet.liquio.local',
  gtmKey: undefined,
  sessionLifeTime: 480,
  enabledMock: false,
  clientId: 'liquio-portal',
  idAuthLink: 'http://id.liquio.local/authorise',
  enabledDeleteUser: false,
  enabledMocksPage: false,
  testCategory: undefined,
  defaultLanguage: 'en'
} satisfies ConfigDefaults;

export default defaults;
