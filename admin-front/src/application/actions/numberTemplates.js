import * as api from 'services/api';
import * as Sentry from '@sentry/browser';
import qs from 'qs';

const REQUEST_NUMBER_TEMPLATES = 'REQUEST_NUMBER_TEMPLATES';
const REQUEST_NUMBER_TEMPLATE = 'REQUEST_NUMBER_TEMPLATE';
const UPDATE_NUMBER_TEMPLATE = 'UPDATE_NUMBER_TEMPLATE';
const CREATE_NUMBER_TEMPLATE = 'CREATE_NUMBER_TEMPLATE';
const DELETE_NUMBER_TEMPLATE = 'DELETE_NUMBER_TEMPLATE';
const UPDATE_NUMBER_TEMPLATE_DATA = 'UPDATE_NUMBER_TEMPLATE_DATA';
const CLEAR_NEW_NUMBER_TEMPLATE = 'CLEAR_NEW_NUMBER_TEMPLATE';
const REQUEST_EXPORT_TEMPLATES = 'REQUEST_EXPORT_TEMPLATES';
const REQUEST_IMPORT_TEMPLATES = 'REQUEST_IMPORT_TEMPLATES';

export const requestNumberTemplates = (options) => (dispatch) => {
  const queryString = qs.stringify(options, { arrayFormat: 'index' });

  return api
    .get(`number-templates?${queryString}`, REQUEST_NUMBER_TEMPLATES, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });
};

export const requestNumberTemplate = (templateId) => (dispatch) =>
  api
    .get(`number-templates/${templateId}`, REQUEST_NUMBER_TEMPLATE, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const updateNumberTemplateData = (templateData) => ({
  type: UPDATE_NUMBER_TEMPLATE_DATA,
  payload: templateData,
});

export const updateNumberTemplate =
  ({ id, ...data }) =>
  (dispatch) =>
    api
      .put(`number-templates/${id}`, data, UPDATE_NUMBER_TEMPLATE, dispatch)
      .catch((error) => {
        Sentry.captureException(error);
        return error;
      });

export const createNumberTemplate = (templateData) => (dispatch) =>
  api
    .post('number-templates', templateData, CREATE_NUMBER_TEMPLATE, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const deleteNumberTemplate = (templateId) => (dispatch) =>
  api
    .del(`number-templates/${templateId}`, {}, DELETE_NUMBER_TEMPLATE, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const exportTemplates = (templateId) => (dispatch) =>
  api
    .get(
      `number-templates/${templateId}/export`,
      REQUEST_EXPORT_TEMPLATES,
      dispatch,
    )
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const importTemplates = (file) => (dispatch) =>
  api
    .upload(
      'number-templates/import',
      file,
      {},
      REQUEST_IMPORT_TEMPLATES,
      dispatch,
    )
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const clearNewTemplate = () => ({
  type: CLEAR_NEW_NUMBER_TEMPLATE,
});
