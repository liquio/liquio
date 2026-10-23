import configureStore from 'store/configureStore';
import { createBrowserHistory } from 'history';

export const history = createBrowserHistory({
  revertPopState: false,
});

const store = configureStore(history);

export default store;
