import ReactDOM from 'react-dom';

// Removed static import to avoid loading App before config is ready
// import App from 'App';
import * as serviceWorker from 'serviceWorker';
import { loadConfig } from './core/helpers/configLoader';

const APP_DEFAULTS = {
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
};

const initializeApp = async () => {
  try {
    const { application: { environment } } = await loadConfig(APP_DEFAULTS);

    // Defer loading App until after config is initialized
    const { default: App } = await import('App');

    ReactDOM.render(<App />, document.getElementById('root'));

    // If you want your app to work offline and load faster, you can change
    // unregister() to register() below. Note this comes with some pitfalls.
    // Learn more about service workers: http://bit.ly/CRA-PWA

    if (environment === 'prod') {
      serviceWorker.register();
    } else {
      serviceWorker.unregister();
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Show loading error
    document.getElementById('root').innerHTML =
      '<div>Failed to load application configuration</div>';
  }
};

initializeApp();
