import * as api from 'services/api';
import * as Sentry from '@sentry/browser';
import qs from 'qs';

import { addError } from 'actions/error';
import blobToBase64 from 'helpers/blobToBase64';

const REQUEST_WORKFLOW_PROCESS = 'REQUEST_WORKFLOW_PROCESS';
const RESTART_WORKFLOW_PROCESS = 'RESTART_WORKFLOW_PROCESS';
const RESTART_WORKFLOW_PROCESS_FROM_POINT =
  'RESTART_WORKFLOW_PROCESS_FROM_POINT';
const UPDATE_WORKFLOW_PROCESS_TASK = 'UPDATE_WORKFLOW_PROCESS_TASK';

const REQUEST_WORKFLOW_PROCESS_ATTACH = 'REQUEST_WORKFLOW_PROCESS_ATTACH';
const REQUEST_WORKFLOW_PROCESS_ATTACH_DECODED =
  'REQUEST_WORKFLOW_PROCESS_ATTACH_DECODED';
const CHECK_AS_NOT_ERROR = 'CHECK_AS_NOT_ERROR';
const STOP_EVENT_DELAY = 'STOP_EVENT_DELAY';
const REQUEST_WORKFLOW_PROCESS_BRIEF = 'REQUEST_WORKFLOW_PROCESS_BRIEF';
const SKIP_EVENT_DELAY = 'SKIP_EVENT_DELAY';

export const restartWorkflowIds = (workflowIds) => (dispatch) =>
  api
    .post(
      'workflow-processes/continue-bulk',
      { workflowIds },
      RESTART_WORKFLOW_PROCESS,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailRestartingWorkflowProcess')));
      Sentry.captureException(error);
      return error;
    });

export const requestWorkflowProcess = (processId) => (dispatch) =>
  api
    .get(
      `workflow-processes/${processId}`,
      REQUEST_WORKFLOW_PROCESS,
      dispatch,
      { processId },
    )
    .catch((error) => {
      // dispatch(addError(new Error('FailFetchingWorkflowProcess')));
      Sentry.captureException(error);
      return error;
    });

export const requestWorkflowProcessBrief = (options) => (dispatch) => {
  const queryString = qs.stringify(options, { arrayFormat: 'index' });
  return api.get(
    `workflow-processes?${queryString}`,
    REQUEST_WORKFLOW_PROCESS_BRIEF,
    dispatch,
  );
};

export const requestWorkflowProcessAttach =
  (processId, { link, id }) =>
  (dispatch) =>
    api
      .get(
        `workflow-processes/${processId}/files/${link}`,
        REQUEST_WORKFLOW_PROCESS_ATTACH,
        dispatch,
      )
      .then(blobToBase64)
      .then(async (decoded) => {
        dispatch({
          id,
          type: REQUEST_WORKFLOW_PROCESS_ATTACH_DECODED,
          payload: decoded,
        });
        return decoded;
      })
      .catch((error) => {
        Sentry.captureException(error);
        return error;
      });

export const requestWorkflowProcessAttachP7S =
  (processId, { link }) =>
  (dispatch) =>
    api
      .get(
        `workflow-processes/${processId}/files/${link}/p7s?as_file=true`,
        REQUEST_WORKFLOW_PROCESS_ATTACH,
        dispatch,
      )
      .then(blobToBase64);

export const restartProcess = (processId) => (dispatch) =>
  api
    .post(
      `workflow-processes/${processId}/continue`,
      {},
      RESTART_WORKFLOW_PROCESS,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailRestartingWorkflowProcess')));
      Sentry.captureException(error);
      return error;
    });

export const restartProcessFromPoint = (processId, message) => (dispatch) =>
  api
    .post(
      `workflow-processes/${processId}/restart`,
      { message },
      RESTART_WORKFLOW_PROCESS_FROM_POINT,
      dispatch,
    )
    .catch((error) => {
      // dispatch(addError(new Error('FailRestartingWorkflowProcessFromPoint')));
      Sentry.captureException(error);
      return error;
    });

export const skipDelayEvent = (eventId) => (dispatch) =>
  api
    .post(`events/${eventId}/skip-delay`, {}, SKIP_EVENT_DELAY, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const stopDelayEvent = (processId, eventId) => (dispatch) =>
  api
    .post(
      `workflow-processes/${processId}/events/${eventId}/cancel`,
      {},
      STOP_EVENT_DELAY,
      dispatch,
    )
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const updateWorkflowProcessTask =
  (processId, taskId, taskData) => (dispatch) =>
    api
      .put(
        `workflow-processes/${processId}/tasks/${taskId}`,
        taskData,
        UPDATE_WORKFLOW_PROCESS_TASK,
        dispatch,
        { processId, taskId, taskData },
      )
      .catch((error) => {
        dispatch(addError(new Error('FailToUpdateWorkflowProcessTask')));
        Sentry.captureException(error);
        return error;
      });

export const checkAsNotError = (processId) => (dispatch) =>
  api
    .put(
      `workflow-processes/${processId}`,
      { hasUnresolvedErrors: false },
      CHECK_AS_NOT_ERROR,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailToCheckAsNotErrorWorkflowProcess')));
      Sentry.captureException(error);
      return error;
    });

export default { requestWorkflowProcess };
