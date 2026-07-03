import config from 'config';
import { getQueryLangParam } from 'actions/auth';

export const normalizeCode = (code) => {
  if (!code) return null;
  const c = String(code).toLowerCase();
  if (c === 'ua' || c === 'uk' || c === 'uk-ua') return 'uk';
  if (c === 'en' || c === 'eng-gb' || c === 'en-gb') return 'eng';
  if (c === 'fr-fr') return 'fr';
  if (c === 'nl-nl') return 'nl';
  if (c === 'de-de') return 'de';
  // for feature
  if (c === 'es-es') return 'es';
  if (c === 'it-it') return 'it';
  if (c === 'pt-pt' || c === 'pt-br') return 'pt';
  if (c === 'zh-cn' || c === 'zh-tw') return 'zh';
  if (c === 'ja-jp') return 'ja';
  if (c === 'ko-kr') return 'ko';
  return code;
};

export const getCurrentLanguageCode = ({
  defaultLanguage = config?.defaultLanguage,
  fallbackLanguage = 'uk-UA',
} = {}) => {
  const languageCode = getQueryLangParam() || defaultLanguage || fallbackLanguage;
  return normalizeCode(languageCode);
};

export const getTranslationCandidates = (languageCode) => {
  const normalized = normalizeCode(languageCode) || languageCode || 'uk';
  const candidates = [languageCode, normalized];

  switch (normalized) {
    case 'uk':
    case 'uk-UA':
      candidates.push('uk-UA', 'uk', 'ua');
      break;
    case 'eng':
      candidates.push('en', 'en-GB', 'eng');
      break;
    case 'nl':
      candidates.push('nl-NL');
      break;
    case 'fr':
      candidates.push('fr-FR');
      break;
    default:
      break;
  }

  return [...new Set(candidates.filter(Boolean))];
};
