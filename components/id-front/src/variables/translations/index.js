import qs from 'qs';
import _ from 'lodash/fp';
import getCookie from 'helpers/getCookie';
import setCookie from 'helpers/setCookie';
import deleteCookie from 'helpers/deleteCookie';
import { getConfig } from 'helpers/configLoader';
import en from './en-GB.js';
import fr from './fr-FR.js';
import ua from './ua-UK.js';

const translations = {
  en,
  eng: en,
  fr: fr,
  bpmn: ua,
};

export const getQueryLangParam = () => {
  const searchString = window.location.search;
  let chosenLanguage = getCookie('lang');
  
  if (!chosenLanguage) {
    try {
      const config = getConfig();
      chosenLanguage = config?.defaultLanguage;
    } catch (e) {
      // Config not loaded yet, continue without default language
    }
  }

  if (chosenLanguage) return chosenLanguage;

  if (!searchString) return null;

  const params = qs.parse(window.location.search, { ignoreQueryPrefix: true });

  const langExists = (Object.keys(params || {}) || []).includes('lang');

  if (!langExists) return null;

  if (langExists) {
    setCookie('lang', params.lang, 1);
    return params.lang;
  }

  deleteCookie('lang');

  return null;
};

const chosenLanguage = getQueryLangParam();

export default (appName) => {
  if (chosenLanguage && translations[chosenLanguage]) {
    return translations[chosenLanguage];
  }

  const themeName = (appName || '').toLowerCase();

  const currentTranslate = translations[themeName] || {};

  const mergeTheme = _.merge(translations.bpmn, currentTranslate);

  return mergeTheme;
};
