import configureStore from 'store/configureStore';
import { createBrowserHistory } from 'history';

export const history = createBrowserHistory();
// `configureStore` takes no arguments; the history used to be passed to it and ignored.
const store = configureStore();

export default store;
