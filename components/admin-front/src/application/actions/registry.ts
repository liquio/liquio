import * as api from 'services/api';
import * as Sentry from '@sentry/browser';
import { addError } from 'actions/error';

type Dispatch = (action: unknown) => unknown;

const EXPORT_REGISTERS = 'EXPORT_REGISTERS';
const IMPORT_REGISTERS = 'IMPORT_REGISTERS';
const GET_REGISTERS_KEYS = 'GET_REGISTERS_KEYS';
const GET_ALL_REGISTERS = 'GET_ALL_REGISTERS';
const GET_ALL_REGISTERS_KEYS = 'GET_ALL_REGISTERS_KEYS';
const IMPORT_REGISTERS_KEYS_XLS = 'IMPORT_REGISTERS_KEYS_XLS';
const IMPORT_REGISTERS_KEYS = 'IMPORT_REGISTERS_KEYS';
const CREATE_REGISTER = 'REGISTRY/CREATE_REGISTER';
const SAVE_REGISTER = 'REGISTRY/SAVE_REGISTER';
const CREATE_KEY = 'REGISTRY/CREATE_KEY';
const SAVE_KEY = 'REGISTRY/SAVE_KEY';
const DELETE_REGISTER = 'REGISTRY/DELETE_REGISTER';
const DELETE_KEY = 'REGISTRY/DELETE_KEY';
const SET_REGISTER_ACCESS = 'SET_REGISTER_ACCESS';
const GET_REGISTER_ACCESS = 'GET_REGISTER_ACCESS';
const PUT_REGISTER_ACCESS = 'PUT_REGISTER_ACCESS';
const EXPORT_REGISTERS_KEYS = 'EXPORT_REGISTERS_KEYS';
const GET_REGISTER = 'GET_REGISTER';

export const exportRegisters =
  (registerId: string | number, withData = false, useStream = true) =>
  (dispatch: Dispatch) =>
    api
      .get(
        `registers/${registerId}/stream-export?with_data=${withData}&file=${useStream}`,
        EXPORT_REGISTERS,
        dispatch,
      )
      .catch((error) => {
        // dispatch(addError(new Error('FailExportingRegisters')));
        Sentry.captureException(error);
        return error;
      });

export const importRegisters =
  (
    file: File,
    force = false,
    rewriteSchema = false,
    clearRecords = false,
    addData = false,
    useStream = true,
  ) =>
  (dispatch: Dispatch) =>
    api
      .upload(
        `registers/stream-import?force=${force}&rewrite_schema=${rewriteSchema}&clear_records=${clearRecords}&add_data=${addData}&file=${useStream}`,
        file,
        {},
        IMPORT_REGISTERS,
        dispatch,
      )
      .catch((error) => {
        // dispatch(addError(new Error('FailImportingRegisters')));
        Sentry.captureException(error);
        return error;
      });

export const getRegistersKeys = (registerId: string | number, silent?: string) => (dispatch: Dispatch) =>
  api
    .get(
      `registers/keys?register_id=${registerId}`,
      GET_REGISTERS_KEYS + (silent || ''),
      dispatch,
      { registerId },
    )
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const getAllRegistersKeys = (registerId: string | number) => (dispatch: Dispatch) =>
  api
    .get(
      `registers/keys/all?register_id=${registerId}`,
      GET_ALL_REGISTERS_KEYS,
      dispatch,
      { registerId },
    )
    .catch((error) => {
      // dispatch(addError(new Error('FailGettingRegistersKeys')));
      Sentry.captureException(error);
      return error;
    });

export const getAllRegisters = () => (dispatch: Dispatch) =>
  api.get('registers/all', GET_ALL_REGISTERS, dispatch).catch((error) => {
    // dispatch(addError(new Error('FailGettingRegistersKeys')));
    Sentry.captureException(error);
    return error;
  });

export const importRegistersKeysXLS =
  (file: File, registerId: string | number, keyId: string | number, unique: string | boolean = '', clear = false) =>
  (dispatch: Dispatch) =>
    api
      .upload(
        `registers/${registerId}/keys/${keyId}/import-xlsx?unique=${unique}&clear_records=${clear}`,
        file,
        {},
        IMPORT_REGISTERS_KEYS_XLS,
        dispatch,
      )
      .catch((error) => {
        // dispatch(addError(new Error('FailImportingRegisters')));
        Sentry.captureException(error);
        return error;
      });

export const createRegister = (data: unknown) => (dispatch: Dispatch) =>
  api.post('registers', data, CREATE_REGISTER, dispatch);
// .catch((error) => {
//     // dispatch(addError(new Error('FailCreatingRegister')));
//     Sentry.captureException(error);
//     return error;
// });

export const saveRegister =
  ({ id, ...data }: { id: string | number; [key: string]: unknown }) =>
  (dispatch: Dispatch) =>
    api.put(`registers/${id}`, data, SAVE_REGISTER, dispatch, { id, data });
// .catch((error) => {
//     // dispatch(addError(new Error('FailCreatingRegister')));
//     Sentry.captureException(error);
//     return error;
// });

export const getRegister = (registerId: string | number) => (dispatch: Dispatch) =>
  api.get(`registers/${registerId}`, GET_REGISTER, dispatch);

export const deleteRegister = (registerId: string | number) => (dispatch: Dispatch) =>
  api.del(`registers/${registerId}`, {}, DELETE_REGISTER, dispatch, {
    registerId,
  });

export const deleteKey =
  ({ registerId, keyId }: { registerId: string | number; keyId: string | number }) =>
  (dispatch: Dispatch) =>
    api.del(
      `registers/keys/${keyId}?register_id=${registerId}`,
      {},
      DELETE_KEY,
      dispatch,
      { registerId, keyId },
    );

export const createKey = (data: { registerId: string | number; [key: string]: unknown }) => (dispatch: Dispatch) => {
  const { registerId } = data;
  return api.post('registers/keys', data, CREATE_KEY, dispatch, {
    registerId,
    data,
  });
};

export const saveKey =
  ({ id, ...data }: { id: string | number; [key: string]: unknown }) =>
  (dispatch: Dispatch) =>
    api.put(`registers/keys/${id}`, data, SAVE_KEY, dispatch, { id, data });

export const setRegistersAccess = (body: unknown) => (dispatch: Dispatch) =>
  api
    .post('unit-access', body, SET_REGISTER_ACCESS, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailSettingRegistersAccess')));
      Sentry.captureException(error);
      return error;
    });

export const getRegistersAccess = () => (dispatch: Dispatch) =>
  api.get('unit-access', GET_REGISTER_ACCESS, dispatch).catch((error) => {
    dispatch(addError(new Error('FailGettingRegistersAccess')));
    Sentry.captureException(error);
    return error;
  });

export const putRegistersAccess = (unitAccessId: string | number, body: unknown, id: string | number) => (dispatch: Dispatch) =>
  api
    .put(`unit-access/${unitAccessId}`, body, PUT_REGISTER_ACCESS, dispatch)
    .catch((e: Error) => {
      let error: Error;
      if (
        e.message === `Cannot add the personal key(${id}) to strict access.`
      ) {
        error = new Error('FailPutingRegistersAccessByStrictAccess');
      } else {
        error = new Error('FailPutingRegistersAccess');
      }
      dispatch(addError(error));
      Sentry.captureException(e);
      return e;
    });

export const exportRegistersKeys = (registerId: string | number, keyId: string | number) => (dispatch: Dispatch) =>
  api
    .get(
      `registers/${registerId}/keys/${keyId}/export-xlsx`,
      EXPORT_REGISTERS_KEYS,
      dispatch,
    )
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const startPreparingExport = (body: unknown) => (dispatch: Dispatch) =>
  api
    .post(
      'register-proxy/admin/export/start-preparing',
      body,
      EXPORT_REGISTERS_KEYS,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailExportingRegisters')));
      Sentry.captureException(error);
      return error;
    });

export const checkExportPreparingStatus = (id: string | number) => (dispatch: Dispatch) =>
  api
    .get(
      `register-proxy/admin/export/${id}/status`,
      EXPORT_REGISTERS_KEYS,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailExportingRegisters')));
      Sentry.captureException(error);
      return error;
    });

export const downloadPreparedRegister = (id: string | number) => (dispatch: Dispatch) =>
  api
    .get(
      `register-proxy/admin/export/${id}/data`,
      EXPORT_REGISTERS_KEYS,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailExportingRegisters')));
      Sentry.captureException(error);
      return error;
    });

export const checkImportPreparingStatus = (id: string | number) => (dispatch: Dispatch) =>
  api
    .get(
      `register-proxy/admin/import/${id}/status`,
      IMPORT_REGISTERS_KEYS,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailExportingRegisters')));
      Sentry.captureException(error);
      return error;
    });

export const getSynchronizationCount = (id?: string | number) => (dispatch: Dispatch) =>
  api
    .get(
      `registers/keys/synced/${id ? `?ids=${id}` : ''}`,
      'GET_SYNCHRONIZATION_STATUS',
      dispatch,
    )
    .catch((error) => error);

export const getAllSynchronizationCount = () => (dispatch: Dispatch) =>
  api
    .get(
      'registers/keys/synced/all',
      'GET_ALL_SYNCHRONIZATION_STATUS',
      dispatch,
    )
    .catch((error) => error);
