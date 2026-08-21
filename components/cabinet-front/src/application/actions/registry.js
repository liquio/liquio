import * as Sentry from '@sentry/browser';
import qs from 'qs';

import * as api from 'services/api';
import { addError } from 'actions/error';

const REQUEST_CUSTOM_DATA = 'REGISTRY/REQUEST_CUSTOM_DATA';
const REQUEST_REGISTERS = 'REGISTRY/REQUEST_REGISTERS';
const REQUEST_REGISTER_KEYS = 'REGISTRY/REQUEST_REGISTER_KEYS';
const REQUEST_REGISTER_KEY_RECORD = 'REGISTRY/REQUEST_REGISTER_KEY_RECORD';
const REQUEST_REGISTER_KEY_RECORDS = 'REGISTRY/REQUEST_REGISTER_KEY_RECORDS';
const REQUEST_REGISTER_KEY_RECORDS_FILTER = 'REGISTRY/REQUEST_REGISTER_KEY_RECORDS_FILTER';
const REQUEST_REGISTER_RELATED_KEY_RECORDS = 'REQUEST_REGISTER_RELATED_KEY_RECORDS';
const REQUEST_RECORD_HISTORY = 'REGISTRY/REQUEST_RECORD_HISTORY';
const REGISTRY_SEARCH = 'REGISTRY/REGISTRY_SEARCH';
const RESTORE_REGISTRY = 'REGISTRY/RESTORE_REGISTRY';
const RESTORE_RECORD = 'REGISTRY/RESTORE_RECORD';
const RESTORE_REGISTRY_STATUS = 'REGISTRY/RESTORE_REGISTRY_STATUS';

export const requestCustomData = (handler, body) => (dispatch) =>
  api
    .post('custom/' + handler.split('.').join('/'), body || {}, REQUEST_CUSTOM_DATA, dispatch, {
      handler
    })
    .catch((error) => {
      error.message === 'Strict access to register record not allowed.' &&
        dispatch(addError(new Error('RegistersAccessNotAllowed')));
      dispatch(addError(new Error('FailLoadingRegisters')));

      Sentry.captureException(error);
      return error;
    });

export const getRequestCustomData = (handler) => (dispatch) =>
  api
    .get('custom/' + handler.split('.').join('/'), REQUEST_CUSTOM_DATA, dispatch, { handler })
    .catch((error) => {
      error.message === 'Strict access to register record not allowed.' &&
        dispatch(addError(new Error('RegistersAccessNotAllowed')));
      dispatch(addError(new Error('FailLoadingRegisters')));

      Sentry.captureException(error);
      return error;
    });

export const requestRegisters = () => (dispatch) =>
  api.get('registers', REQUEST_REGISTERS, dispatch).catch((error) => {
    dispatch(addError(new Error('FailLoadingRegisters')));
    Sentry.captureException(error);
    return error;
  });

export const requestRegisterKeys = () => (dispatch) =>
  api.get('registers/keys', REQUEST_REGISTER_KEYS, dispatch).catch((error) => {
    if ((error.message || '').indexOf('signature') !== -1) {
      dispatch(addError(new Error('RegistersSignaruteError')));
    } else {
      dispatch(addError(new Error('FailLoadingRegisterKeys')));
    }

    Sentry.captureException(error);
    return error;
  });

export const requestRegisterKeyRecords = (keyId, options, rawFilters) => (dispatch) => {
  const queryString = rawFilters ? options : qs.stringify(options, { arrayFormat: 'index' });

  return api
    .get(`registers/keys/${keyId}/records?${queryString}`, REQUEST_REGISTER_KEY_RECORDS, dispatch)
    .catch((error) => {
      if (error.message === 'Strict access to register record not allowed.') {
        dispatch(addError(new Error('RegistersAccessNotAllowed')));
      } else {
        dispatch(addError(new Error('FailLoadingRegisterKeyRecords')));
      }

      Sentry.captureException(error);
      return error;
    });
};

export const requestRegisterKeyRecordsFilter = (keyId, options) => (dispatch) => {
  const queryString = qs.stringify(options, { arrayFormat: 'index' });

  return api
    .post(
      `registers/keys/${keyId}/records/filter?${queryString}`,
      {},
      REQUEST_REGISTER_KEY_RECORDS_FILTER,
      dispatch,
      { keyId, options }
    )
    .catch((e) => {
      const error = new Error('FailLoadingRegisterKeyRecords');
      error.details = e.message;
      dispatch(addError(error));
      Sentry.captureException(e);
      return e;
    });
};

export const requestRegisterKeyRecord = (keyId, recordId) => (dispatch) =>
  api
    .get(`registers/keys/${keyId}/records/${recordId}`, REQUEST_REGISTER_KEY_RECORD, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailLoadingRegisterKeyRecord')));
      Sentry.captureException(error);
      return error;
    });

export const requestRegisterRelatedKeyRecords = (keyIds, options) => (dispatch) =>
  api
    .get(
      `registers/keys/${keyIds}/records_tree${options ? `?${options}` : ''}`,
      REQUEST_REGISTER_RELATED_KEY_RECORDS,
      dispatch,
      { keyIds, options }
    )
    .catch((error) => {
      dispatch(addError(new Error('FailLoadingRegisterKeyRecords')));
      Sentry.captureException(error);
      return error;
    });

export const requestRecordHistory = (keyId, recordId) => (dispatch) =>
  api
    .get(`registers/keys/${keyId}/records/${recordId}/history`, REQUEST_RECORD_HISTORY, dispatch, {
      keyId,
      recordId
    })
    .catch((error) => {
      dispatch(addError(new Error('FailLoadingRegisterKeyRecords')));
      Sentry.captureException(error);
      return error;
    });

export const registerSearch = (keyId, text, limit, offset) => (dispatch) =>
  api.get(
    `registers/keys/${keyId}/search?text=${text}&limit=${limit}&offset=${offset}`,
    REGISTRY_SEARCH,
    dispatch
  );

export const createRecord = (keyId, body) => (dispatch) =>
  api
    .post(`registers/keys/${keyId}/records`, body, 'SAVE_USER_FEEDBACK', dispatch)
    .catch((error) => error);

export const restoreRegistry = (body) => (dispatch) =>
  api.post('registers/rollback/start', body, RESTORE_REGISTRY, dispatch).catch((error) => error);

export const restoreRecord = (body) => (dispatch) =>
  api.post('registers/rollback/record', body, RESTORE_RECORD, dispatch).catch((error) => error);

export const checkRestoreRegisterStatus = (id) => (dispatch) =>
  api.get(`registers/rollback/${id}/status`, RESTORE_REGISTRY_STATUS, dispatch).catch((error) => {
    dispatch(addError(new Error('FailRestoringRegisters')));
    Sentry.captureException(error);
    return error;
  });
