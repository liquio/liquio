import * as api from 'services/api';
import * as Sentry from '@sentry/browser';

type Dispatch = (action: unknown) => unknown;

const REQUEST_QR_TEMPLATES = 'REQUEST_QR_TEMPLATES';
const REQUEST_QR_TEMPLATE = 'REQUEST_QR_TEMPLATE';
const CREATE_QR_TEMPLATE = 'CREATE_QR_TEMPLATE';
const UPDATE_QR_TEMPLATE = 'UPDATE_QR_TEMPLATE';
const DELETE_QR_TEMPLATE = 'DELETE_QR_TEMPLATE';

export const requestQrTemplates = () => (dispatch: Dispatch) =>
  api.get('plink/templates', REQUEST_QR_TEMPLATES, dispatch).catch((error) => {
    Sentry.captureException(error);
    return error;
  });

export const requestQrTemplate = (id: string | number) => (dispatch: Dispatch) =>
  api.get(`plink/templates/${id}`, REQUEST_QR_TEMPLATE, dispatch);

export const createQrTemplate = (templateData: unknown) => (dispatch: Dispatch) =>
  api
    .post('plink/templates', templateData, CREATE_QR_TEMPLATE, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });
export const updateQrTemplate = (id: string | number, template: unknown) => (dispatch: Dispatch) =>
  api
    .put(`plink/templates/${id}`, template, UPDATE_QR_TEMPLATE, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const deleteQrTemplate = (id: string | number, template: unknown) => (dispatch: Dispatch) =>
  api
    .del(`plink/templates/${id}`, template, DELETE_QR_TEMPLATE, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });
