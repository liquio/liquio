import * as Sentry from '@sentry/browser';

import * as api from 'services/api';
import { addError } from 'actions/error';

type Dispatch = (action: unknown) => unknown;

const MARK_INBOX_READ = 'MARK_INBOX_READ';
const GET_UNREAD_INBOX_COUNT = 'GET_UNREAD_INBOX_COUNT';

export const getUnreadInboxCount = () => (dispatch: Dispatch) =>
  api.get('user-inboxes/unread/count', GET_UNREAD_INBOX_COUNT, dispatch).catch((error) => {
    dispatch(addError(new Error('FailGettingUnreadInboxCount')));
    Sentry.captureException(error);
  });

export const markInboxRead = (inboxId: string | number) => (dispatch: Dispatch) =>
  api
    .put(`user-inboxes/${inboxId}/is-read`, {}, MARK_INBOX_READ, dispatch)
    .then((result) => {
      getUnreadInboxCount()(dispatch);
      return result;
    })
    .catch((error) => {
      dispatch(addError(new Error('FailMarkInboxRead')));
      Sentry.captureException(error);
    });
