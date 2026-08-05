import * as Sentry from '@sentry/browser';

import * as api from 'services/api';
import { addError } from 'actions/error';

const REQUEST_UNIT_INFO = 'REQUEST_UNIT_INFO';
const ADD_UNIT_USER = 'ADD_UNIT_USER';
const DELETE_UNIT_USER = 'DELETE_UNIT_USER';

const GET_USER_INFO = 'GET_USER_INFO';
const SEARCH_USERS = 'SEARCH_USERS';

export const requestUnitInfo = (unitId) => (dispatch) =>
  api.get(`units/${unitId}/as-head`, REQUEST_UNIT_INFO, dispatch);

export const addUnitUser = (unitId, user) => (dispatch) =>
  api.post(`units/${unitId}/requested-members`, user, ADD_UNIT_USER, dispatch).catch((error) => {
    // dispatch(addError(new Error('FailAddingUser')));
    Sentry.captureException(error);
    return error;
  });

export const deleteUnitUser =
  (unitId, { ipn, userId }) =>
  (dispatch) =>
    api
      .del(`units/${unitId}/members`, userId ? { userId } : { ipn }, DELETE_UNIT_USER, dispatch)
      .catch((error) => {
        // dispatch(addError(new Error('FailDeletingUser')));
        Sentry.captureException(error);
        return error;
      });

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
