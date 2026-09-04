import * as api from 'services/api';
import * as Sentry from '@sentry/browser';

import { addError } from 'actions/error';

const SEARCH_USERS = 'SEARCH_USERS';
const GET_USER_INFO = 'GET_USER_INFO';

export const searchUsers = (searchData) => (dispatch) =>
  api
    .post('users/search', searchData, SEARCH_USERS, dispatch)
    .then((users) => users.filter(Boolean).map((user) => ({ ...user, id: user.userId })))
    .catch((error) => {
      dispatch(addError(new Error('FailSearchingUsers')));
      Sentry.captureException(error);
      return error;
    });

export const getUserInfo = (userId) => (dispatch) =>
  api.get(`users/${userId}`, GET_USER_INFO, dispatch);
