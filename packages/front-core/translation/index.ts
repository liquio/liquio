import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/fr';
import 'moment/locale/de';
import store from 'store';

import ukUA from 'translation/uk-UA';
import enGB from 'translation/en-GB';
import frFR from 'translation/fr-FR';
import deDE from 'translation/de-DE';
import nlNL from 'translation/nl-NL';
import plugins from 'plugins';
import { getQueryLangParam } from 'actions/auth';
import handleTranslateText from 'helpers/handleTranslateText';
import {
  getCurrentLanguageCode,
  getTranslationCandidates,
  pickLocalizedTexts,
} from 'helpers/localization';
import { getConfig } from 'core/helpers/configLoader';

const translations: Record<string, Record<string, unknown>> = {
  'uk-UA': ukUA,
  uk: ukUA,
  ua: ukUA,
  'en-GB': enGB,
  en: enGB,
  eng: enGB,
  'fr-FR': frFR,
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
  const chosenLanguage = (getQueryLangParam() || DEFAULT_TRANSLATION) as string;

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
      const state = store.getState() as unknown as { app: { localizationTexts?: unknown[] } };
      const { localizationTexts } = state.app;

      if (Array.isArray(localizationTexts) && localizationTexts.length && !isTriggered) {
        const selectedLanguageCode = getCurrentLanguageCode({
          defaultLanguage: chosenLanguage,
          fallbackLanguage: 'uk',
        });
        const preferredCandidates = getTranslationCandidates(selectedLanguageCode);
        const preparedTexts = pickLocalizedTexts(localizationTexts as never, preferredCandidates);
        handleTranslateText(preparedTexts, chosenTranslation);
        isTriggered = true;
      }
    });
    subscribed = true;
  }

  const pluginTranslations = ([] as Record<string, unknown>[])
    .concat(plugins as unknown as Record<string, unknown>[])
    .filter((plugin) => plugin.translations && (plugin.translations as Record<string, unknown>)[DEFAULT_TRANSLATION])
    .map((plugin) => (plugin.translations as Record<string, unknown>)[DEFAULT_TRANSLATION])
    .reduce((acc: Record<string, unknown>, tr) => ({ ...acc, ...(tr as Record<string, unknown>) }), {} as Record<string, unknown>);

  return {
    ...chosenTranslation,
    ...pluginTranslations,
    locale: chosenTranslation?.locale
  };
}
