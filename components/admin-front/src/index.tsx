import { createRoot } from 'react-dom/client';

// Removed static import to avoid loading App before config is ready
// import App from 'App';
import * as serviceWorker from 'serviceWorker';
import { loadConfig } from 'core/helpers/configLoader';

import APP_DEFAULTS from './configDefaults';

const initializeApp = async () => {
  try {
    const { application: { environment, name } } = await loadConfig(APP_DEFAULTS);

    if (typeof name === 'string' && name.trim()) {
      document.title = name;
    }

    // Defer loading App until after config is initialized
    const { default: App } = await import('App');

    createRoot(document.getElementById('root')!).render(<App />);

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
    document.getElementById('root')!.innerHTML =
      '<div>Failed to load application configuration</div>';
  }
};

initializeApp();
