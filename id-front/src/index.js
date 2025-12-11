import { loadConfig } from 'helpers/configLoader';
import React from 'react';
import ReactDOM from 'react-dom';

const DEFAULT_CONFIG = {
  APP_NAME: 'liquio',
  APP_TITLE: 'Liquio',
  APP_ENV: 'development',
  BACKEND_URL: '/',
  BUILD_ID: 'false',
  ONLINE_HELP: false,
  SHOW_PHONE: false,
  SHOW_PHONE_CONFIRM: false,
  FORCE_REGISTER: true,
  passwordAuth: true,
  defaultLanguage: 'en',
};

// Only load App lazily; App will bootstrap itself
const initializeApp = async () => {
  try {
    // Load configuration first
    await loadConfig(DEFAULT_CONFIG);

    // Start the application
    const { default: App } = await import('./App');
    ReactDOM.render(React.createElement(App), document.getElementById('root'));
  } catch (error) {
    console.error('Failed to initialize app:', error);
    document.getElementById('root').innerHTML = '<div>Failed to load application configuration</div>';
  }
};

initializeApp();
