import * as api from 'services/api';

type Dispatch = (action: unknown) => unknown;

export const getLocalizationLanguages = () => (dispatch: Dispatch) =>
  api.get('localization-languages', 'GET_LOCALIZATION_LANG', dispatch).catch((error) => {
    return error;
  });

export const getLocalizationTexts = (code?: string) => (dispatch: Dispatch) =>
  api
    .get(
      `localization-texts${code ? `?filters[localization_language_code]=${code}` : ''}`,
      'GET_LOCALIZATION_TEXT',
      dispatch
    )
    .catch((error) => {
      return error;
    });
