import * as Sentry from '@sentry/browser';

import * as api from 'services/api';
import { addError } from 'actions/error';

type Dispatch = (action: unknown) => unknown;

const LOAD_WORKFLOW = 'LOAD_WORKFLOW';
const LOAD_WORKFLOW_TEMPLATE = 'LOAD_WORKFLOW_TEMPLATE';
const LOAD_WORKFLOW_TEMPLATES = 'LOAD_WORKFLOW_TEMPLATES';
const LOAD_WORKFLOW_CATEGORIES = 'LOAD_WORKFLOW_CATEGORIES';
const LOAD_WORKFLOW_STATUSES = 'LOAD_WORKFLOW_STATUSES';
const LOAD_WORKFLOW_LOGS = 'LOAD_WORKFLOW_LOGS';

export const loadWorkflow = (workflowId: string | number) => (dispatch: Dispatch) =>
  api.get(`workflows/${workflowId}`, LOAD_WORKFLOW, dispatch).catch((error) => {
    dispatch(addError(new Error('FailLoadingWorkflow')));
    Sentry.captureException(error);
  });

export const loadWorkflowTemplate = (templateId: string | number) => (dispatch: Dispatch) =>
  api.get(`workflow-templates/${templateId}`, LOAD_WORKFLOW_TEMPLATE, dispatch).catch((error) => {
    dispatch(addError(new Error('FailLoadingWorkflowTemplate')));
    Sentry.captureException(error);
  });

export const loadWorkflowTemplates = () => (dispatch: Dispatch) =>
  api.get('workflow-templates', LOAD_WORKFLOW_TEMPLATES, dispatch).catch((error) => {
    dispatch(addError(new Error('FailLoadingWorkflowTemplates')));
    Sentry.captureException(error);
  });

export const loadWorkflowCategories = () => (dispatch: Dispatch) =>
  api.get('workflow-template-categories', LOAD_WORKFLOW_CATEGORIES, dispatch).catch((error) => {
    dispatch(addError(new Error('FailLoadingWorkflowCategories')));
    Sentry.captureException(error);
  });

export const loadWorkflowStatuses = () => (dispatch: Dispatch) =>
  api.get('dictionaries/workflow-statuses', LOAD_WORKFLOW_STATUSES, dispatch).catch((error) => {
    dispatch(addError(new Error('FailLoadingWorkflowStatuses')));
    Sentry.captureException(error);
  });

export const loadWorkflowLogs = (workflowId: string | number) => (dispatch: Dispatch) =>
  api
    .get(`workflow-logs/${workflowId}`, LOAD_WORKFLOW_LOGS, dispatch, {
      workflowId
    })
    .catch((error) => {
      dispatch(addError(new Error('FailLoadingWorkflowLogs')));
      Sentry.captureException(error);
    });
