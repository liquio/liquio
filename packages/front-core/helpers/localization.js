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
    case 'de':
      candidates.push('de-DE');
      break;
    default:
      break;
  }

  return [...new Set(candidates.filter(Boolean))];
};

const getLanguageCodeRank = (preferredCandidates = []) => {
  const fallbackCandidates = ['en', 'eng', 'en-GB', 'uk', 'ua', 'uk-UA'];
  const orderedCodes = [...preferredCandidates, ...fallbackCandidates];

  return orderedCodes.reduce((acc, code, index) => {
    const normalized = normalizeCode(code) || String(code || '').toLowerCase();
    if (!acc.has(normalized)) {
      acc.set(normalized, index);
    }
    return acc;
  }, new Map());
};

export const pickLocalizedTexts = (localizationTexts = [], preferredCandidates = []) => {
  if (!Array.isArray(localizationTexts) || !localizationTexts.length) return [];

  const rankByCode = getLanguageCodeRank(preferredCandidates);
  const byKey = new Map();

  localizationTexts.forEach((item) => {
    const key = item?.key;
    const value = item?.value;
    const languageCode = item?.localizationLanguageCode;

    if (!key || typeof value !== 'string') return;

    const normalizedCode =
      normalizeCode(languageCode) || String(languageCode || '').toLowerCase();
    const rank = rankByCode.has(normalizedCode)
      ? rankByCode.get(normalizedCode)
      : Number.MAX_SAFE_INTEGER;

    const existing = byKey.get(key);

    if (!existing || rank < existing.rank) {
      byKey.set(key, { key, value, rank });
    }
  });

  return Array.from(byKey.values()).map(({ key, value }) => ({ key, value }));
};
