import * as api from 'services/api';
import store from 'store';

const { dispatch } = store;

const REQUEST_SIGN_DATA = 'REQUEST_SIGN_DATA';
const CHECK_SIGN_DATA = 'CHECK_SIGN_DATA';

export function requestSignData() {
  return api.get('authorise/eds/sign', REQUEST_SIGN_DATA, dispatch);
}

export function checkSignData(options) {
  return api.post('authorise/eds', options, CHECK_SIGN_DATA, dispatch);
}
