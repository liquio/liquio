import * as Sentry from '@sentry/browser';

import * as api from 'services/api';
import { addError } from 'actions/error';

type Dispatch = (action: unknown) => unknown;

const GET_MESSAGES = 'GET_MESSAGES';
const MARK_MESSAGE_READ = 'MARK_MESSAGE_READ';
const GET_UNREAD_MESSAGE_COUNT = 'GET_UNREAD_MESSAGE_COUNT';
const GET_VIEWED_MESSAGE_LIST = 'GET_VIEWED_MESSAGE_LIST';
const GET_UNREAD_MESSAGE_COUNT_SUCCESS = 'GET_UNREAD_MESSAGE_COUNT_SUCCESS';

const SET_DECRYPTED_DATA = 'MESSAGES/SET_DECRYPTED_DATA';

export const getMessages = () => (dispatch: Dispatch) =>
  api.get('messages', GET_MESSAGES, dispatch).catch((error) => {
    dispatch(addError(new Error('FailGettingMessages')));
    Sentry.captureException(error);
  });

export const getUnreadMessageCount = () => (dispatch: Dispatch) =>
  api.get('messages/count-unread', GET_UNREAD_MESSAGE_COUNT, dispatch).catch((error) => {
    dispatch(addError(new Error('FailGettingUnreadMessageCount')));
    Sentry.captureException(error);
  });

export const markMessageRead = (messageId: string | number) => (dispatch: Dispatch) =>
  api
    .put('messages/state', { messageId }, MARK_MESSAGE_READ, dispatch)
    .then((result) => {
      getUnreadMessageCount()(dispatch);
      return result;
    })
    .catch((error) => {
      // dispatch(addError(new Error('FailMarkMessageRead')));
      Sentry.captureException(error);
    });
export const setViewedMessagesList = (data: unknown) => (dispatch: Dispatch) =>
  dispatch({ type: GET_VIEWED_MESSAGE_LIST, payload: data });

export const setUnreadMessagesCount = (data: unknown) => (dispatch: Dispatch) =>
  dispatch({
    type: GET_UNREAD_MESSAGE_COUNT_SUCCESS,
    payload: { total: data }
  });

export const setDecryptedData = (messageId: string | number, decryptedBase64: unknown) => (dispatch: Dispatch) =>
  api.put(`messages/${messageId}/decrypt`, { decryptedBase64 }, SET_DECRYPTED_DATA, dispatch);
