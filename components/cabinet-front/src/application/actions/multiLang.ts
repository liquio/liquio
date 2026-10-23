import * as api from 'services/api';

type Dispatch = (action: unknown) => unknown;

export const getLanguages = () => (dispatch: Dispatch) =>
  api.get('localization-languages', 'GET_LANGUAGES', dispatch).catch((error) => error);

export const createLanguage = (body: unknown) => (dispatch: Dispatch) =>
  api.post('localization-languages', body, 'CREATE_LANGUAGE', dispatch);

export const updateLanguage = (code: string, body: unknown) => (dispatch: Dispatch) =>
  api.put(`localization-languages/${code}`, body, 'UPDATE_LANGUAGE', dispatch);

export const deleteLanguage = (code: string) => (dispatch: Dispatch) =>
  api.del(`localization-languages/${code}`, {}, 'DELETE_LANGUAGE', dispatch);

export const exportLanguages = (body: unknown) => (dispatch: Dispatch) =>
  api
    .post('localization-languages/export', body, 'EXPORT_LANGUAGES', dispatch)
    .catch((error) => error);

export const searchLocalization = (key: string) => (dispatch: Dispatch) =>
  api
    .get(`localization-texts?filters[key]=${key}`, 'SEARCH_LOCALIZATION', dispatch)
    .catch((error) => error);

export const exportTexts = (body: unknown) => (dispatch: Dispatch) =>
  api.post('localization-texts/export', body, 'EXPORT_LANGUAGES', dispatch).catch((error) => error);

export const importLanguages = (file: File) => (dispatch: Dispatch) =>
  api
    .upload('localization-languages/import?force=true', file, {}, 'IMPORT_LANGUAGES', dispatch)
    .catch((error) => error);

export const importTexts = (file: File) => (dispatch: Dispatch) =>
  api
    .upload('localization-texts/import?force=true', file, {}, 'IMPORT_LANGUAGES', dispatch)
    .catch((error) => error);

export const getTextsList = () => (dispatch: Dispatch) =>
  api.get('localization-texts', 'GET_TRANSLATIONS', dispatch).catch((error) => error);

export const createTranslation = (body: unknown) => (dispatch: Dispatch) =>
  api.post('localization-texts', body, 'CREATE_TRANSLATION', dispatch);

export const updateTranslation = (lanCode: string, key: string, body: unknown) => (dispatch: Dispatch) =>
  api.put(`localization-texts/${lanCode}/${key}`, body, 'UPDATE_TRANSLATION', dispatch);

export const deleteTranslation = (lanCode: string, key: string) => (dispatch: Dispatch) =>
  api.del(`localization-texts/${lanCode}/${key}`, {}, 'DELETE_TRANSLATION', dispatch);
