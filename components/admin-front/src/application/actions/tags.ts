import * as api from 'services/api';
import { addError } from 'actions/error';
import * as Sentry from '@sentry/browser';

type Dispatch = (action: unknown) => unknown;

const REQUEST_WORKFLOW_TAGS = 'REQUEST_WORKFLOW_TAGS';
const CHANGE_TAGS = 'CHANGE_WORKFLOW_TAGS';
const CREATE_TAGS = 'CREATE_WORKFLOW';
const DELETE_TAGS = 'DELETE_WORKFLOW';
const ADD_TAGS_TO_WORKFLOW = 'ADD_TAGS_TO_WORKFLOW';

export const getTagList = (params: string) => (dispatch: Dispatch) =>
  api
    .get(`workflow-tags?${params}`, REQUEST_WORKFLOW_TAGS, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailFetchingWorkflowTags')));
      Sentry.captureException(error);
      return error;
    });

export const updateTag = (tagId: string | number, data: unknown) => (dispatch: Dispatch) =>
  api
    .put(`workflow-tags/${tagId}`, data, CHANGE_TAGS, dispatch, {})
    .catch((error) => {
      dispatch(addError(new Error('TagExists')));
      Sentry.captureException(error);
      return error;
    });

export const addTagToWorkflow = (workwlowId: string | number, data: unknown) => (dispatch: Dispatch) => api
  .put(
    `workflows/${workwlowId}/set-tags`,
    data,
    ADD_TAGS_TO_WORKFLOW,
    dispatch,
    {},
  )
  .catch((error) => {
    Sentry.captureException(error);
    return error;
  });

export const createTag = (data: unknown) => (dispatch: Dispatch) =>
  api.post('workflow-tags', data, CREATE_TAGS, dispatch).catch((error) => {
    if ((error as { message?: string })?.message === 'Tag already exists.') {
      dispatch(addError(new Error('TagExists')));
    } else if ((error as { message?: string })?.message === 'Invalid value') {
      dispatch(addError(new Error('TagNotCreated')));
    }
    Sentry.captureException(error);
    return error;
  });

export const deleteTag = (tagId: string | number) => (dispatch: Dispatch) =>
  api
    .del(`workflow-tags/${tagId}`, {}, DELETE_TAGS, dispatch, {
      tagId,
    })
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });
