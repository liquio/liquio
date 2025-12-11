import React from 'react';
import ReactDOM from 'react-dom';

import * as serviceWorker from 'core/serviceWorker';
import { loadConfig } from 'helpers/configLoader';

const DEFAULT_CONFIG = {
  application: {
    name: 'liquio',
    environment: 'dev',
    type: 'manager',
    version: 'SETVERSION'
  },
  certificateExpWarning: 10,
  variables: {
    dateFormat: 'DD/MM/YYYY',
    dateTimeFormat: 'DD/MM/YYYY HH:mm'
  },
  defaultRoute: '/messages',
  backendUrl: 'http://localhost:8101',
  authLink: 'http://localhost:8101/redirect/auth',
  idAuthLink: 'http://localhost:8080/authorise',
  clientId: 'liquio-portal',
  defaultLanguage: 'en-GB'
};

const initializeApp = async () => {
  const config = await loadConfig(DEFAULT_CONFIG);
  const {
    application: { environment }
  } = config;

  // Defer loading App until after config is initialized
  const { default: App } = await import('App');

  ReactDOM.render(React.createElement(App), document.getElementById('root'));

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
