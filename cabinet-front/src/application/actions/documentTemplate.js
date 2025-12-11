import * as Sentry from '@sentry/browser';

import * as api from 'services/api';
import { addError } from 'actions/error';

const LOAD_DOCUMENT_TEMPLATE = 'LOAD_DOCUMENT_TEMPLATE';
const LOAD_DOCUMENT_TEMPLATES = 'LOAD_DOCUMENT_TEMPLATES';
const LOAD_TASK_TEMPLATES = 'LOAD_TASK_TEMPLATES';
const LOAD_DOCUMENT_TEMPLATE_SUCCESS = 'LOAD_DOCUMENT_TEMPLATE_SUCCESS';

export const loadDocumentTemplate = (templateId) => (dispatch) =>
  api.get(`document-templates/${templateId}`, LOAD_DOCUMENT_TEMPLATE, dispatch).catch((error) => {
    Sentry.captureException(error);
    return error;
  });

export const loadTaskTemplates = (templateId) => (dispatch) =>
  api.get(`task-templates/${templateId}`, LOAD_TASK_TEMPLATES, dispatch).catch((error) => {
    Sentry.captureException(error);
    return error;
  });

export const loadDocumentTemplates = () => (dispatch) =>
  api.get('document-templates', LOAD_DOCUMENT_TEMPLATES, dispatch).catch((error) => {
    dispatch(addError(new Error('FailLoadingDocumentTemplate')));
    Sentry.captureException(error);
    return error;
  });

export const jsonSchemaInjection = (payload) => (dispatch) =>
  dispatch({
    type: LOAD_DOCUMENT_TEMPLATE_SUCCESS,
    payload
  });
