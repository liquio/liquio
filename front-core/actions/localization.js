import * as api from 'services/api';

export const getLocalizationLanguages = () => (dispatch) =>
  api.get('localization-languages', 'GET_LOCALIZATION_LANG', dispatch).catch((error) => {
    return error;
  });

export const getLocalizationTexts = (code) => (dispatch) =>
  api
    .get(
      `localization-texts${code ? `?filters[localization_language_code]=${code}` : ''}`,
      'GET_LOCALIZATION_TEXT',
      dispatch
    )
    .catch((error) => {
      return error;
    });
