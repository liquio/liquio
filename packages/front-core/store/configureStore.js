import { getConfig } from 'core/helpers/configLoader';

import { applyMiddleware, createStore, compose } from 'redux';
import thunk from 'redux-thunk';
import { routerMiddleware } from 'react-router-redux';
import { createLogger } from 'redux-logger';

import reducers from 'core/reducers';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default function configureStore(history) {
  const config = getConfig();
  const {
    application: { environment },
  } = config;

  return createStore(
    reducers,
    composeEnhancers(
      applyMiddleware(
        ...[
          routerMiddleware(history),
          thunk,
          environment !== 'prod' && createLogger({ collapsed: true }),
        ].filter(Boolean),
      ),
    ),
  );
}
