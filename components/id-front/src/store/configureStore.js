import { applyMiddleware, createStore } from 'redux';
import { createLogger } from 'redux-logger';
import rootReducer from '../reducers';
import { getConfig } from '../helpers/configLoader';

export default function configureStore() {
  const config = getConfig();
  const { APP_ENV: environment } = config;
  
  if (environment !== 'production') {
    return createStore(rootReducer, applyMiddleware(createLogger({ collapsed: true })));
  }
  return createStore(rootReducer);
}
