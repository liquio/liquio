import * as api from 'services/api';

export const getLanguages = () => (dispatch) =>
  api
    .get('localization-languages', 'GET_LANGUAGES', dispatch)
    .catch((error) => error);

export const createLanguage = (body) => (dispatch) =>
  api.post('localization-languages', body, 'CREATE_LANGUAGE', dispatch);

export const updateLanguage = (code, body) => (dispatch) =>
  api.put(`localization-languages/${code}`, body, 'UPDATE_LANGUAGE', dispatch);

export const deleteLanguage = (code) => (dispatch) =>
  api.del(`localization-languages/${code}`, {}, 'DELETE_LANGUAGE', dispatch);

export const exportLanguages = (body) => (dispatch) =>
  api
    .post('localization-languages/export', body, 'EXPORT_LANGUAGES', dispatch)
    .catch((error) => error);

export const searchLocalization = (key) => (dispatch) =>
  api
    .get(
      `localization-texts?filters[key]=${key}`,
      'SEARCH_LOCALIZATION',
      dispatch,
    )
    .catch((error) => error);

export const exportTexts = (body) => (dispatch) =>
  api
    .post('localization-texts/export', body, 'EXPORT_LANGUAGES', dispatch)
    .catch((error) => error);

export const importLanguages = (file) => (dispatch) =>
  api
    .upload(
      'localization-languages/import?force=true',
      file,
      {},
      'IMPORT_LANGUAGES',
      dispatch,
    )
    .catch((error) => error);

export const importTexts = (file) => (dispatch) =>
  api
    .upload(
      'localization-texts/import?force=true',
      file,
      {},
      'IMPORT_LANGUAGES',
      dispatch,
    )
    .catch((error) => error);

export const getTextsList = () => (dispatch) =>
  api
    .get('localization-texts', 'GET_TRANSLATIONS', dispatch)
    .catch((error) => error);

export const createTranslation = (body) => (dispatch) =>
  api.post('localization-texts', body, 'CREATE_TRANSLATION', dispatch);

export const updateTranslation = (lanCode, key, body) => (dispatch) =>
  api.put(
    `localization-texts/${lanCode}/${key}`,
    body,
    'UPDATE_TRANSLATION',
    dispatch,
  );

export const deleteTranslation = (lanCode, key) => (dispatch) =>
  api.del(
    `localization-texts/${lanCode}/${key}`,
    {},
    'DELETE_TRANSLATION',
    dispatch,
  );
