import qs from 'qs';
import _ from 'lodash/fp';
import getCookie from 'helpers/getCookie';
import setCookie from 'helpers/setCookie';
import deleteCookie from 'helpers/deleteCookie';
import { getConfig } from 'helpers/configLoader';
import en from './en-GB';
import fr from './fr-FR';
import ua from './ua-UK';
import type { Translations } from './types';

const translations: { [name: string]: Translations } = {
  en,
  eng: en,
  fr: fr,
  bpmn: ua,
};

export const getQueryLangParam = (): string | null => {
  const searchString = window.location.search;
  let chosenLanguage: string | null | undefined = getCookie('lang');

  if (!chosenLanguage) {
    try {
      const config = getConfig();
      chosenLanguage = config?.defaultLanguage;
    } catch {
      // Config not loaded yet, continue without default language
    }
  }

  if (chosenLanguage) return chosenLanguage;

  if (!searchString) return null;

  const params = qs.parse(window.location.search, { ignoreQueryPrefix: true });

  const langExists = (Object.keys(params || {}) || []).includes('lang');

  if (!langExists) return null;

  if (langExists) {
    // Preserved: `lang` is not validated. `?lang[]=x` or `?lang[a]=b` parse to an array or
    // object, which is written to the cookie as text and returned as is.
    setCookie('lang', params.lang as string, 1);
    return params.lang as string;
  }

  // Unreachable (langExists is always true here); kept as it was.
  deleteCookie('lang');

  return null;
};

// Evaluated once at import time, so a language change needs a page reload.
const chosenLanguage = getQueryLangParam();

export default (appName?: string): Translations => {
  if (chosenLanguage && translations[chosenLanguage]) {
    return translations[chosenLanguage];
  }

  const themeName = (appName || '').toLowerCase();

  const currentTranslate: Translations | Record<string, never> = translations[themeName] || {};

  const mergeTheme = _.merge(translations.bpmn, currentTranslate);

  return mergeTheme as Translations;
};
