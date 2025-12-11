import * as api from 'services/api';
import * as Sentry from '@sentry/browser';

import { addError } from 'actions/error';

const BLOCK_USER = 'USERS/BLOCK_USER';
const UNBLOCK_USER = 'USERS/UNBLOCK_USER';

const SET_USER_ADMIN = 'USERS/SET_USER_ADMIN';
const UNSET_USER_ADMIN = 'USERS/UNSET_USER_ADMIN';

const SEARCH_USERS = 'SEARCH_USERS';
const SEARCH_USERS_SILENT = 'SEARCH_USERS_SILENT';
const DELETE_USER = 'DELETE_USER';

export const blockUser = (userId) => (dispatch) =>
  api
    .post(`users/${userId}/block`, {}, BLOCK_USER, dispatch, { userId })
    .catch((error) => {
      // dispatch(addError(new Error('FailFetchingUnit')));
      Sentry.captureException(error);
      return error;
    });

export const unblockUser = (userId) => (dispatch) =>
  api
    .post(`users/${userId}/unblock`, {}, UNBLOCK_USER, dispatch, { userId })
    .catch((error) => {
      // dispatch(addError(new Error('FailFetchingUnit')));
      Sentry.captureException(error);
      return error;
    });

export const setAdmin = (userId) => (dispatch) =>
  api
    .post(`users/${userId}/set-admin`, {}, SET_USER_ADMIN, dispatch, { userId })
    .catch((error) => {
      if (
        error?.message ===
        'Assigning the administrator role to test users is prohibited'
      ) {
        dispatch(addError(new Error('FailSetAdminTestUser')));
      }
      Sentry.captureException(error);
      return error;
    });

export const unsetAdmin = (userId) => (dispatch) =>
  api
    .post(`users/${userId}/unset-admin`, {}, UNSET_USER_ADMIN, dispatch, {
      userId,
    })
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const searchUsers = (searchData, params, props) => (dispatch) =>
  api
    .post(
      `users/search${params ? params : ''}`,
      searchData,
      SEARCH_USERS,
      dispatch,
    )
    .then((users) =>
      users.filter(Boolean).map((user) => ({ ...user, id: user.userId })),
    )
    .catch((error) => {
      const { silent } = props || {};
      !silent && dispatch(addError(new Error('FailSearchingUsers')));
      Sentry.captureException(error);
      return error;
    });

export const getUsers = (params, silent) => (dispatch) =>
  api
    .get(
      `users${params ? params : ''}`,
      silent ? SEARCH_USERS_SILENT : SEARCH_USERS,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailSearchingUsers')));
      Sentry.captureException(error);
      return error;
    });

export const deleteUser =
  ({ id, body }) =>
  (dispatch) =>
    api.del(`users/${id}`, body, DELETE_USER, dispatch).catch((error) => {
      // dispatch(addError(new Error('FailFetchingUnit')));
      Sentry.captureException(error);
      return error;
    });
