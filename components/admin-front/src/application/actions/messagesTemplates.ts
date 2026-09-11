import * as api from 'services/api';
import * as Sentry from '@sentry/browser';

type Dispatch = (action: unknown) => unknown;

const REQUEST_MESSAGES_TEMPLATE = 'REQUEST_MESSAGES_TEMPLATE';
const UPDATE_MESSAGES_TEMPLATE = 'UPDATE_MESSAGES_TEMPLATE';
const CREATE_MESSAGES_TEMPLATE = 'CREATE_MESSAGES_TEMPLATE';
const DELETE_MESSAGES_TEMPLATE = 'DELETE_MESSAGES_TEMPLATE';
const EXPORT_MESSAGES_TEMPLATE = 'EXPORT_MESSAGES_TEMPLATE';
const REQUEST_IMPORT_TEMPLATES = 'REQUEST_IMPORT_TEMPLATES';

export const requestMessagesTemplate = () => (dispatch: Dispatch) =>
  api
    .get('message-templates', REQUEST_MESSAGES_TEMPLATE, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const updateMessagesTemplate =
  ({ id, ...data }: { id: string | number; [key: string]: unknown }) =>
  (dispatch: Dispatch) =>
    api
      .put(`message-templates/${id}`, data, UPDATE_MESSAGES_TEMPLATE, dispatch)
      .catch((error) => {
        Sentry.captureException(error);
        return error;
      });

export const createMessagesTemplate = (templateData: unknown) => (dispatch: Dispatch) =>
  api
    .post('message-templates', templateData, CREATE_MESSAGES_TEMPLATE, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const deleteMessagesTemplate =
  ({ template_id }: { template_id: string | number }) =>
  (dispatch: Dispatch) =>
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
  ({ template_id }: { template_id?: string | number }) =>
  (dispatch: Dispatch) =>
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

export const importMessagesTemplate = (file: File, params?: string) => (dispatch: Dispatch) => {
  const url = `message-templates/import${params ? '?' + params : ''}`;
  return api
    .upload(url, file, {}, REQUEST_IMPORT_TEMPLATES, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });
};
