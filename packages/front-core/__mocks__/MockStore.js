import React from 'react';
import { Provider } from 'react-redux';

function MockStore({ store, children }) {
  return (
    <Provider
      store={
        store || {
          getState: () => ({
            auth: { info: {} },
            app: { mainScrollbar: {} }
          }),
          subscribe: () => {},
          dispatch: () => {},
          errors: {}
        }
      }
    >
      {children}
    </Provider>
  );
}

export default MockStore;
