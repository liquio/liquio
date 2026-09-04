import * as api from 'services/api';
import * as Sentry from '@sentry/browser';

const REQUEST_MESSAGES_TEMPLATE = 'REQUEST_MESSAGES_TEMPLATE';
const UPDATE_MESSAGES_TEMPLATE = 'UPDATE_MESSAGES_TEMPLATE';
const CREATE_MESSAGES_TEMPLATE = 'CREATE_MESSAGES_TEMPLATE';
const DELETE_MESSAGES_TEMPLATE = 'DELETE_MESSAGES_TEMPLATE';
const EXPORT_MESSAGES_TEMPLATE = 'EXPORT_MESSAGES_TEMPLATE';
const REQUEST_IMPORT_TEMPLATES = 'REQUEST_IMPORT_TEMPLATES';

export const requestMessagesTemplate = () => (dispatch) =>
  api
    .get('message-templates', REQUEST_MESSAGES_TEMPLATE, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const updateMessagesTemplate =
  ({ id, ...data }) =>
  (dispatch) =>
    api
      .put(`message-templates/${id}`, data, UPDATE_MESSAGES_TEMPLATE, dispatch)
      .catch((error) => {
        Sentry.captureException(error);
        return error;
      });

export const createMessagesTemplate = (templateData) => (dispatch) =>
  api
    .post('message-templates', templateData, CREATE_MESSAGES_TEMPLATE, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const deleteMessagesTemplate =
  ({ template_id }) =>
  (dispatch) =>
    api
      .del(
        `message-templates/${template_id}`,
        {},
        DELETE_MESSAGES_TEMPLATE,
        dispatch,
      )
      .catch((error) => {
        Sentry.captureException(error);
        return error;
      });

export const exportMessagesTemplate =
  ({ template_id }) =>
  (dispatch) =>
    api
      .get(
        `message-templates/export${
          template_id ? `?template_ids[0]=${template_id}` : ''
        }`,
        EXPORT_MESSAGES_TEMPLATE,
        dispatch,
      )
      .catch((error) => {
        Sentry.captureException(error);
        return error;
      });

export const importMessagesTemplate = (file, params) => (dispatch) => {
  const url = `message-templates/import${params ? '?' + params : ''}`;
  return api
    .upload(url, file, {}, REQUEST_IMPORT_TEMPLATES, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });
};
