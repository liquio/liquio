import * as api from 'services/api';
import * as Sentry from '@sentry/browser';

import { addError } from 'actions/error';

const REQUEST_UNIT = 'UNITS/REQUEST_UNIT';
const UPDATE_UNIT_DATA = 'UNITS/UPDATE_UNIT_DATA';
const SAVE_UNIT = 'UNITS/SAVE_UNIT';
const CREATE_UNIT = 'UNITS/CREATE_UNIT';
const CLEAR_NEW_UNIT = 'UNITS/CLEAR_NEW_UNIT';
const EXPORT_UNITS = 'EXPORT_UNITS';
const IMPORT_UNITS = 'IMPORT_UNITS';

const ADD_UNIT_HEADS = 'UNITS/ADD_UNIT_HEADS';
const DELETE_UNIT_HEAD = 'UNITS/DELETE_UNIT_HEAD';
const ADD_UNIT_MEMBERS = 'UNITS/ADD_UNIT_MEMBERS';
const DELETE_UNIT_MEMBER = 'UNITS/DELETE_UNIT_MEMBER';
const REQUEST_ALL_UNITS = 'UNITS/REQUEST_ALL_UNITS';

export const requestUnit = (unitId, props) => (dispatch) =>
  api.get(`units/${unitId}`, REQUEST_UNIT, dispatch).catch((error) => {
    const { silent } = props || {};
    !silent && dispatch(addError(new Error('FailFetchingUnit')));
    Sentry.captureException(error);
    return error;
  });

export const updateUnitData = (unit) => ({
  type: UPDATE_UNIT_DATA,
  payload: unit,
});

export const clearNewUnit = () => ({
  type: CLEAR_NEW_UNIT,
});

export const saveUnit =
  ({ id: unitId, ...unitData }) =>
  (dispatch) =>
    api.put(`units/${unitId}`, unitData, SAVE_UNIT, dispatch).catch((e) => {
      let error;

      // eslint-disable-next-line no-useless-escape
      const test = new RegExp(
        'Unit exclusive rules error with user (.+).',
        'gm',
      ).exec(e.message);

      if (test && test[1]) {
        const [, id] = test;
        error = new Error('FailSavingUnitExclusiveUnits');
        error.data = { userId: id };
      } else {
        error = new Error('FailSavingUnit');
        error.details = e.message;
        if (e.message === "Can't save - conflicts in fields: members.") {
          error.details =
            'Конфлікт в полі "користувачі". Можливо хтось редагувавав разом з вами. Перевірте введені дані.';
        }
      }
      error.autoClose = false;

      dispatch(addError(error));
      Sentry.captureException(e);
      return e;
    });

export const createUnit = (unitData) => (dispatch) =>
  api.post('units', unitData, CREATE_UNIT, dispatch).catch((error) => {
    // dispatch(addError(new Error('FailCreatingUnit')));
    Sentry.captureException(error);
    return error;
  });

export const exportUnits = (rowsExported) => (dispatch) =>
  api
    .post('units/export', { ids: rowsExported }, EXPORT_UNITS, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailExportingUnits')));
      Sentry.captureException(error);
      return error;
    });

export const importUnits =
  (file, force = false) =>
  (dispatch) =>
    api
      .upload(`units/import?force=${force}`, file, {}, IMPORT_UNITS, dispatch)
      .catch((error) => {
        // dispatch(addError(new Error('FailImportingUnits')));
        Sentry.captureException(error);
        return error;
      });

export const addUnitHeads = (unitId, heads) => (dispatch) =>
  api.post(`units/${unitId}/heads`, { heads }, ADD_UNIT_HEADS, dispatch, {
    unitId,
    heads,
  });
export const deleteUnitHeads = (unitId, heads) => (dispatch) =>
  api.del(`units/${unitId}/heads`, { heads }, DELETE_UNIT_HEAD, dispatch, {
    unitId,
    heads,
  });
export const addUnitMembers = (unitId, members) => (dispatch) =>
  api.post(`units/${unitId}/members`, { members }, ADD_UNIT_MEMBERS, dispatch, {
    unitId,
    members,
  });
export const deleteUnitMembers = (unitId, members) => (dispatch) =>
  api.del(
    `units/${unitId}/members`,
    { members },
    DELETE_UNIT_MEMBER,
    dispatch,
    { unitId, members },
  );

export const requestAllUnits = () => (dispatch) =>
  api.get('units/all', REQUEST_ALL_UNITS, dispatch).catch((error) => {
    Sentry.captureException(error);
    return error;
  });
