import * as Sentry from '@sentry/browser';

import * as api from 'services/api';
import { addError } from 'actions/error';

type Dispatch = (action: unknown) => unknown;

const REQUEST_UNIT_INFO = 'REQUEST_UNIT_INFO';
const ADD_UNIT_USER = 'ADD_UNIT_USER';
const DELETE_UNIT_USER = 'DELETE_UNIT_USER';

const GET_USER_INFO = 'GET_USER_INFO';
const SEARCH_USERS = 'SEARCH_USERS';

export const requestUnitInfo = (unitId: string | number) => (dispatch: Dispatch) =>
  api.get(`units/${unitId}/as-head`, REQUEST_UNIT_INFO, dispatch);

export const addUnitUser = (unitId: string | number, user: unknown) => (dispatch: Dispatch) =>
  api.post(`units/${unitId}/requested-members`, user, ADD_UNIT_USER, dispatch).catch((error) => {
    // dispatch(addError(new Error('FailAddingUser')));
    Sentry.captureException(error);
    return error;
  });

export const deleteUnitUser =
  (unitId: string | number, { ipn, userId }: { ipn?: string; userId?: string | number }) =>
  (dispatch: Dispatch) =>
    api
      .del(`units/${unitId}/members`, userId ? { userId } : { ipn }, DELETE_UNIT_USER, dispatch)
      .catch((error) => {
        // dispatch(addError(new Error('FailDeletingUser')));
        Sentry.captureException(error);
        return error;
      });

export const searchUsers = (searchData: unknown) => (dispatch: Dispatch) =>
  api
    .post('users/search', searchData, SEARCH_USERS, dispatch)
    .then((users) =>
      (users as Array<{ userId: string | number; [key: string]: unknown }>)
        .filter(Boolean)
        .map((user) => ({ ...user, id: user.userId })))
    .catch((error) => {
      dispatch(addError(new Error('FailSearchingUsers')));
      Sentry.captureException(error);
      return error;
    });

export const getUserInfo = (userId: string | number) => (dispatch: Dispatch) =>
  api.get(`users/${userId}`, GET_USER_INFO, dispatch);
