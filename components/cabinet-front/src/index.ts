import React from 'react';
import { createRoot } from 'react-dom/client';

import * as serviceWorker from 'core/serviceWorker';
import { loadConfig } from 'helpers/configLoader';

import DEFAULT_CONFIG from './configDefaults';

const initializeApp = async () => {
  const config = await loadConfig(DEFAULT_CONFIG);
  const {
    application: { environment, name }
  } = config;

  // Apply runtime app name as early as possible, before route-level title logic runs.
  if (typeof name === 'string' && name.trim()) {
    document.title = name;
  }

  // Defer loading App until after config is initialized
  const { default: App } = await import('App');

  createRoot(document.getElementById('root')!).render(React.createElement(App));

  // If you want your app to work offline and load faster, you can change
  // unregister() to register() below. Note this comes with some pitfalls.
  // Learn more about service workers: http://bit.ly/CRA-PWA

  if (environment === 'prod') {
    serviceWorker.register();
  } else {
    serviceWorker.unregister();
  }
};

initializeApp();
