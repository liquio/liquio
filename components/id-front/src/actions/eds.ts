import * as api from 'services/api';
import store from 'store';
import type { AppDispatch } from '../store/types';

// `store` does not import `actions` or `services/api`, so reading it here at module level is not circular.
type Dispatch = AppDispatch;
const dispatch: Dispatch = store.dispatch;

const REQUEST_SIGN_DATA = 'REQUEST_SIGN_DATA';

export function requestSignData() {
  return api.get('authorise/eds/sign', REQUEST_SIGN_DATA, dispatch);
}
