import * as api from 'services/api';
import * as Sentry from '@sentry/browser';

import { addError } from 'actions/error';

type Dispatch = (action: unknown) => unknown;

const BLOCK_USER = 'USERS/BLOCK_USER';
const UNBLOCK_USER = 'USERS/UNBLOCK_USER';

const SET_USER_ADMIN = 'USERS/SET_USER_ADMIN';
const UNSET_USER_ADMIN = 'USERS/UNSET_USER_ADMIN';

const SEARCH_USERS = 'SEARCH_USERS';
const SEARCH_USERS_SILENT = 'SEARCH_USERS_SILENT';
const DELETE_USER = 'DELETE_USER';

export const blockUser = (userId: string | number) => (dispatch: Dispatch) =>
  api
    .post(`users/${userId}/block`, {}, BLOCK_USER, dispatch, { userId })
    .catch((error) => {
      // dispatch(addError(new Error('FailFetchingUnit')));
      Sentry.captureException(error);
      return error;
    });

export const unblockUser = (userId: string | number) => (dispatch: Dispatch) =>
  api
    .post(`users/${userId}/unblock`, {}, UNBLOCK_USER, dispatch, { userId })
    .catch((error) => {
      // dispatch(addError(new Error('FailFetchingUnit')));
      Sentry.captureException(error);
      return error;
    });

export const setAdmin = (userId: string | number) => (dispatch: Dispatch) =>
  api
    .post(`users/${userId}/set-admin`, {}, SET_USER_ADMIN, dispatch, { userId })
    .catch((error) => {
      const err = error as { response?: { error?: { message?: string }; message?: string }; message?: string };
      const errorMessage =
        err?.response?.error?.message ||
        err?.response?.message ||
        err?.message;

      if (
        errorMessage ===
        'Assigning the administrator role to test users is prohibited'
      ) {
        dispatch(addError(new Error('FailSetAdminTestUser')));
      }
      Sentry.captureException(error);
      return error;
    });

export const unsetAdmin = (userId: string | number) => (dispatch: Dispatch) =>
  api
    .post(`users/${userId}/unset-admin`, {}, UNSET_USER_ADMIN, dispatch, {
      userId,
    })
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const searchUsers = (searchData: unknown, params?: string, props?: { silent?: boolean }) => (dispatch: Dispatch) =>
  api
    .post(
      `users/search${params ? params : ''}`,
      searchData,
      SEARCH_USERS,
      dispatch,
    )
    .then((users) =>
      (users as Array<{ userId: string | number; [key: string]: unknown }>)
        .filter(Boolean)
        .map((user) => ({ ...user, id: user.userId })),
    )
    .catch((error) => {
      const { silent } = props || {};
      !silent && dispatch(addError(new Error('FailSearchingUsers')));
      Sentry.captureException(error);
      return error;
    });

export const getUsers = (params?: string, silent?: boolean) => (dispatch: Dispatch) =>
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
  ({ id, body }: { id: string | number; body?: unknown }) =>
  (dispatch: Dispatch) =>
    api.del(`users/${id}`, body, DELETE_USER, dispatch).catch((error) => {
      // dispatch(addError(new Error('FailFetchingUnit')));
      Sentry.captureException(error);
      return error;
    });
