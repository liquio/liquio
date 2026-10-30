import * as api from 'services/api';
import store from 'store';
import type { AppDispatch } from '../store/types';

// `store` does not import `actions` or `services/api`, so reading it here at module level is not circular.
type Dispatch = AppDispatch;
const dispatch: Dispatch = store.dispatch;

const REQUEST_SIGN_DATA = 'REQUEST_SIGN_DATA';
const CHECK_SIGN_DATA = 'CHECK_SIGN_DATA';

export function requestSignData() {
  return api.get('authorise/eds/sign', REQUEST_SIGN_DATA, dispatch);
}

export function checkSignData(options: unknown) {
  return api.post('authorise/eds', options, CHECK_SIGN_DATA, dispatch);
}
