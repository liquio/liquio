import configureStore from 'store/configureStore';
import { createBrowserHistory } from 'history';

export const history = createBrowserHistory();
const store = configureStore(history);

export default store;
