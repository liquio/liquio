import KeyEntity from '../entities/key';

const PATH_PATTERN = /^[A-Za-z_]\w*(\.(?:[A-Za-z_]\w*|\d+))*$/;
const RESERVED_SEGMENTS = ['__proto__', 'prototype', 'constructor'];

function columnReadable(property: any, tokens: string[]): boolean {
  const allowed = property.allowTokens;
  if (!allowed) return true;
  if (!Array.isArray(allowed) || allowed.some((token) => typeof token !== 'string')) {
    throw new Error('Invalid column allow tokens.');
  }
  return allowed.some((token) => tokens.includes(token));
}

function responseRules(key: KeyEntity): string[][] | undefined {
  const rules = key.schema?.responseFields;
  if (!rules) return undefined;
  if (!Array.isArray(rules) || rules.some((rule) => typeof rule !== 'string')) {
    throw new Error('Invalid response fields.');
  }
  return rules.filter(Boolean).map((rule) => rule.split('.'));
}

/** Searching a partly projected object can reveal hidden descendants through matches/counts. */
export function canSearchField(key: KeyEntity, path: string, tokens: string[]): boolean {
  if (typeof path !== 'string' || !PATH_PATTERN.test(path)) return false;
  const segments = path.split('.');
  if (segments.some((segment) => RESERVED_SEGMENTS.includes(segment))) return false;
  const property = key.schema?.properties?.[segments[0]];
  if (property !== undefined && !columnReadable(property, tokens)) return false;

  let rules = responseRules(key);
  if (!rules) return true;
  for (const segment of segments) {
    if (rules.some((rule) => rule[0] === '**')) return true;
    rules = rules.filter((rule) => rule[0] === segment || rule[0] === '*').map((rule) => rule.slice(1));
    if (!rules.length) return false;
    if (!rules.flat().length) return true;
  }
  return (
    rules.some((rule) => rule[0] === '**') || (rules.some((rule) => rule.length === 1 && rule[0] === '*') && rules.every((rule) => rule.length === 1))
  );
}

/** The stored search string has unknown dependencies: require complete data visibility. */
export function canSearchString(key: KeyEntity, tokens: string[]): boolean {
  const columns = Object.values(key.schema?.properties || {});
  if (!columns.every((property) => columnReadable(property, tokens))) return false;
  const rules = responseRules(key);
  if (!rules || rules.some((rule) => rule[0] === '**')) return true;
  // A root wildcard with only root rules preserves every value. Nested rules may trim it.
  return rules.some((rule) => rule.length === 1 && rule[0] === '*') && rules.every((rule) => rule.length === 1);
}
