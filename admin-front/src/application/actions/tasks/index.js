import * as api from 'services/api';
import * as Sentry from '@sentry/browser';
import store from 'store';

// import { addError } from 'actions/error';

import { entityToBody } from './mapping';

const REQUEST_TASK = 'TASKS/REQUEST_TASK';
const DELETE_TASK = 'TASKS/DELETE_TASK';
const SAVE_TASK_DATA = 'TASKS/SAVE_TASK_DATA';

const CHANGE_TASK_DATA = 'TASKS/CHANGE_TASK_DATA';
const UNDO_TASK_DATA = 'UNDO_TASK_DATA';

export const requestTask = (taskId) => (dispatch) =>
  api
    .get(`tasks/${taskId}`, REQUEST_TASK, dispatch, { taskId })
    .catch((error) => {
      // dispatch(addError(new Error('FailFetchingTask')));
      // Sentry.captureException(error);
      return error;
    });

export const deleteTask = (taskId) => (dispatch) =>
  api
    .del(`tasks/${taskId}`, {}, DELETE_TASK, dispatch, { taskId })
    .catch((error) => {
      // dispatch(addError(new Error('FailDeletingTask')));
      Sentry.captureException(error);
      return error;
    });

export const saveTaskData = (data) => (dispatch) => {
  const {
    workflow: { versions },
  } = store.getState();

  const taskList = [].concat(data).map(entityToBody);
  const { workflowTemplateId } = taskList[0] || {};

  return api
    .post(
      'tasks',
      taskList,
      SAVE_TASK_DATA,
      dispatch,
      { data: taskList, workflowTemplateId },
      {
        headers: { 'Last-Workflow-History-Id': versions[workflowTemplateId] },
      },
    )
    .catch((error) => {
      // dispatch(addError(new Error('FailSavingTask')));
      Sentry.captureException(error);
      return error;
    });
};

export const changeTaskData = (taskId, data) => ({
  type: CHANGE_TASK_DATA,
  payload: { taskId, data },
});

export const undoTaskData = (taskId) => ({
  type: UNDO_TASK_DATA,
  payload: { taskId },
});
