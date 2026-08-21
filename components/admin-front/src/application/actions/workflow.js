import * as api from 'services/api';
import * as Sentry from '@sentry/browser';
import qs from 'qs';

import { addError } from 'actions/error';

import store from 'store';

const ELEMENT_CHANGED = 'WORKFLOW/ELEMENT_CHANGED';
const ELEMENT_SELECT = 'WORKFLOW/ELEMENT_SELECT';

const CHANGE_WORKFLOW_DATA = 'WORKFLOW/CHANGE_WORKFLOW_DATA';
const STORE_WORKFLOW_DATA = 'WORKFLOW/STORE_WORKFLOW_DATA';
const CREATE_WORKFLOW = 'WORKFLOW/CREATE_WORKFLOW';

const REQUEST_WORKFLOW = 'WORKFLOW/REQUEST_WORKFLOW';
const EXPORT_WORKFLOW = 'EXPORT_WORKFLOW';
const IMPORT_WORKFLOW = 'IMPORT_WORKFLOW';
const DELETE_WORKFLOW = 'DELETE_WORKFLOW';

const REQUEST_WORKFLOW_CATEGORIES = 'WORKFLOW/REQUEST_WORKFLOW_CATEGORIES';
const UPDATE_WORKFLOW_CATEGORY = 'WORKFLOW/UPDATE_WORKFLOW_CATEGORY';
const CREATE_WORKFLOW_CATEGORY = 'WORKFLOW/CREATE_WORKFLOW_CATEGORY';
const DELETE_WORKFLOW_CATEGORY = 'WORKFLOW/DELETE_WORKFLOW_CATEGORY';

const REQUEST_WORKFLOW_STATUSES = 'WORKFLOW/REQUEST_WORKFLOW_STATUSES';
const GET_WORKFLOW_VERSIONS = 'GET_WORKFLOW_VERSIONS';
const CREATE_WORKFLOW_VERSION = 'CREATE_WORKFLOW_VERSION';
const RESTORE_WORKFLOW_VERSION = 'RESTORE_WORKFLOW_VERSION';
const WORKFLOW_ELEMENT_COPIED = 'WORKFLOW_ELEMENT_COPIED';
const REQUEST_WORKFLOWS = 'REQUEST_WORKFLOWS';
const SUBSCRIBE_TO_WORKFLOW = 'SUBSCRIBE_TO_WORKFLOW';
const DELETE_SIGN = 'DELETE_SIGN';
const GET_DELETED_SIGN = 'GET_DELETED_SIGN';

export const onElementChange = (event) => ({
  type: ELEMENT_CHANGED,
  payload: event,
});

export const onElementSelect = (event) => ({
  type: ELEMENT_SELECT,
  payload: event,
});

export const handleCopyElement = (payload) => ({
  type: WORKFLOW_ELEMENT_COPIED,
  payload,
});

export const changeWorkflowData = (workflowId, data) => ({
  type: CHANGE_WORKFLOW_DATA,
  payload: { workflowId, data },
});

export const storeWorkflowData = (workflowId, data) => (dispatch) => {
  const {
    workflow: { versions },
  } = store.getState();

  return api
    .put(
      `workflows/${workflowId}`,
      data,
      STORE_WORKFLOW_DATA,
      dispatch,
      {},
      {
        headers: { 'Last-Workflow-History-Id': versions[workflowId] },
      },
    )
    .catch((error) => {
      // dispatch(addError(new Error('FailStoreWorkflow')));
      Sentry.captureException(error);
      return error;
    });
};

export const createWorkflow = (data) => (dispatch) =>
  api.post('workflows', data, CREATE_WORKFLOW, dispatch).catch((error) => {
    // dispatch(addError(new Error('FailCreatingWorkflow')));
    Sentry.captureException(error);
    return error;
  });

export const requestWorkflowStatuses = () => (dispatch) =>
  api
    .get('workflow-statuses', REQUEST_WORKFLOW_STATUSES, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailFetchingWorkflowStatuses')));
      Sentry.captureException(error);
      return error;
    });

export const requestWorkflowCategories = (options) => (dispatch) => {
  const queryString = qs.stringify(options, { arrayFormat: 'index' });

  return api
    .get(
      `workflows/categories?${queryString}`,
      REQUEST_WORKFLOW_CATEGORIES,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailFetchingWorkflowCategories')));
      Sentry.captureException(error);
      return error;
    });
};

export const updateWorkflowCategory = (categoryId, data) => (dispatch) =>
  api
    .put(
      `workflows/categories/${categoryId}`,
      data,
      UPDATE_WORKFLOW_CATEGORY,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailUpdatingWorkflowCategory')));
      Sentry.captureException(error);
      return error;
    });

export const createWorkflowCategory = (data) => (dispatch) =>
  api
    .post('workflows/categories', data, CREATE_WORKFLOW_CATEGORY, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailCreatingWorkflowCategory')));
      Sentry.captureException(error);
      return error;
    });

export const deleteWorkflowCategory = (categoryId) => (dispatch) =>
  api
    .del(
      `workflows/categories/${categoryId}`,
      {},
      DELETE_WORKFLOW_CATEGORY,
      dispatch,
      { categoryId },
    )
    .catch((error) => {
      // dispatch(addError(new Error('FailDeletingWorkflowCategory')));
      Sentry.captureException(error);
      return error;
    });

export const requestWorkflow = (workflowId) => (dispatch) =>
  api
    .get(`workflows/${workflowId}`, REQUEST_WORKFLOW, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailFetchingWorkflow')));
      Sentry.captureException(error);
      return error;
    });

export const exportWorkflow = (workflowId) => (dispatch) =>
  api
    .get(`bpmn-workflows/${workflowId}/export`, EXPORT_WORKFLOW, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailExportingWorkflow')));
      Sentry.captureException(error);
      return error;
    });

export const importWorkflow =
  (file, force = false, ignore = false) =>
  (dispatch) =>
    api
      .upload(
        `bpmn-workflows/import?force=${force}&ignore_validation_errors=${ignore}`,
        file,
        {},
        IMPORT_WORKFLOW,
        dispatch,
      )
      .catch((error) => {
        // dispatch(addError(new Error('FailImportingWorkflow')));
        Sentry.captureException(error);
        return error;
      });

export const deleteWorkflow = (workflowId) => (dispatch) =>
  api
    .del(`workflows/${workflowId}`, {}, DELETE_WORKFLOW, dispatch, {
      workflowId,
    })
    .catch((error) => {
      // dispatch(addError(new Error('FailDeletingWorkflow')));
      Sentry.captureException(error);
      return error;
    });

export const getWorkflowVersions = (workflowId) => (dispatch) =>
  api
    .get(
      `bpmn-workflows/${workflowId}/versions`,
      GET_WORKFLOW_VERSIONS,
      dispatch,
    )
    .catch((error) => {
      // dispatch(addError(new Error('FailGettingWorkflowVersions')));
      Sentry.captureException(error);
      return error;
    });

export const createWorkflowVersion = (workflowId) => (dispatch) => {
  const {
    workflow: { versions },
  } = store.getState();

  return api
    .post(
      `bpmn-workflows/${workflowId}/versions`,
      {},
      CREATE_WORKFLOW_VERSION,
      dispatch,
      {},
      {
        headers: { 'Last-Workflow-History-Id': versions[workflowId] },
      },
    )
    .catch((error) => {
      // dispatch(addError(new Error('FailCreatingWorkflowVersion')));
      Sentry.captureException(error);
      return error;
    });
};

export const restoreWorkflowVersion = (workflowId, version) => (dispatch) => {
  const {
    workflow: { versions },
  } = store.getState();

  return api
    .post(
      `bpmn-workflows/${workflowId}/versions/${version}/restore`,
      { workflowId, version },
      RESTORE_WORKFLOW_VERSION,
      dispatch,
      {},
      {
        headers: { 'Last-Workflow-History-Id': versions[workflowId] },
      },
    )
    .catch((error) => {
      //  dispatch(addError(new Error('FailRestoringWorkflowVersion')));
      Sentry.captureException(error);
      return error;
    });
};

export const requestWorkflows = (params) => (dispatch) =>
  api.get(`workflows?${params}`, REQUEST_WORKFLOWS, dispatch).catch((error) => {
    dispatch(addError(new Error('FailFetchingWorkflows')));
    Sentry.captureException(error);
    return error;
  });

export const subscribeToProcess = (workflowId) => (dispatch) =>
  api
    .post(
      `bpmn-workflows/${workflowId}/errors-subscribers`,
      {},
      SUBSCRIBE_TO_WORKFLOW,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailCreatingWorkflowCategory')));
      Sentry.captureException(error);
      return error;
    });

export const unSubscribeToProcess = (workflowId) => (dispatch) =>
  api
    .del(
      `bpmn-workflows/${workflowId}/errors-subscribers`,
      {},
      SUBSCRIBE_TO_WORKFLOW,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailCreatingWorkflowCategory')));
      Sentry.captureException(error);
      return error;
    });

export const deleteSign = (workflowId, documentId) => (dispatch) =>
  api
    .del(
      `workflow-processes/${workflowId}/documents/${documentId}/signatures`,
      {},
      DELETE_SIGN,
      dispatch,
    )
    .catch((error) => {
      if (error.message === 'Passed wrong workflowId.') {
        error = new Error('WrongWorkflowId');
      } else if (error.message === 'Task is already finished.') {
        error = new Error('TaskFinished');
      } else if (error.message === 'Document is already final.') {
        error = new Error('DocumentFinished');
      } else if (error.message === 'Task is deleted.') {
        error = new Error('TaskDeleted');
      } else if (error.message === "Signatures by documentId doesn't exist.") {
        error = new Error('SignaturesNotFound');
      }
      dispatch(addError(error));
      Sentry.captureException(error);
      return error;
    });

export const getDeletedSign = (workflowId) => (dispatch) =>
  api
    .get(`workflow-processes/${workflowId}`, GET_DELETED_SIGN, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const prepareCopyWorkflow = (workflowId) => (dispatch) =>
  api.get(
    `bpmn-workflows/${workflowId}/copy/preparation`,
    'PREPARE_COPY_WORKFLOW',
    dispatch,
  );

export const copyWorkflow = (workflowId, body) => (dispatch) =>
  api.post(
    `bpmn-workflows/${workflowId}/copy`,
    body,
    'COPY_WORKFLOW',
    dispatch,
  );
