import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/fr';
import 'moment/locale/de';
import store from 'store';

import ukUA from 'translation/uk-UA';
import enGB from 'translation/en-GB';
import frFR from 'translation/fr-FR';
import deDE from 'translation/de-DE';
import nlNL from 'translations/nl-NL';
import plugins from 'plugins';
import { getQueryLangParam } from 'actions/auth';
import handleTranslateText from 'helpers/handleTranslateText';
import { getConfig } from 'core/helpers/configLoader';

const translations = {
  'uk-UA': ukUA,
  'en-GB': enGB,
  eng: enGB,
  fr: frFR,
  'de-DE': deDE,
  de: deDE,
  'nl-NL': nlNL,
  nl: nlNL
};

let subscribed = false;
let isTriggered = false;

// Returns translations object based on current config and URL language
export default function getTranslations() {
  const config = getConfig();

  const DEFAULT_TRANSLATION = config?.defaultLanguage || 'en-GB';
  const chosenLanguage = getQueryLangParam() || DEFAULT_TRANSLATION;

  switch (chosenLanguage) {
    case 'en':
    case 'eng':
    case 'en-GB':
      moment.locale('en');
      break;
    case 'fr':
      moment.locale('fr');
      break;
    case 'de':
    case 'de-DE':
      moment.locale('de');
      break;
    case 'nl':
    case 'nl-NL':
      moment.locale('nl');
      break;
    default: {
      moment.locale('uk');
      break;
    }
  }

  const chosenTranslation =
    translations[chosenLanguage] || translations[DEFAULT_TRANSLATION] || enGB;

  if (config.multiLanguage && !subscribed) {
    store.subscribe(() => {
      const state = store.getState();
      const { localizationTexts } = state.app;

      if (localizationTexts && !isTriggered) {
        handleTranslateText(localizationTexts, chosenTranslation);
        isTriggered = true;
      }
    });
    subscribed = true;
  }

  const pluginTranslations = []
    .concat(plugins)
    .filter((plugin) => plugin.translations && plugin.translations[DEFAULT_TRANSLATION])
    .map((plugin) => plugin.translations[DEFAULT_TRANSLATION])
    .reduce((acc, tr) => ({ ...acc, ...tr }), {});

  return {
    ...chosenTranslation,
    ...pluginTranslations,
    locale: chosenTranslation?.locale
  };
}
