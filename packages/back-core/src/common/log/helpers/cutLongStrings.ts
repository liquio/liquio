// Constants.
const DEFAULT_LIMIT = 80;
const ENDING = '...';

/**
 * Truncate long strings within a string or object so its serialized size stays under the given limit.
 * @param strOrObj String or object to process.
 * @param limit Maximum serialized length.
 * @returns Processed string or object with long strings truncated.
 */
export const cutLongStrings = (strOrObj: string | Record<string, unknown>, limit: number = DEFAULT_LIMIT): string | Record<string, unknown> => {
  let prepared: unknown;
  if (typeof strOrObj === 'string') {
    try {
      prepared = JSON.parse(strOrObj);
    } catch {
      prepared = strOrObj;
    }
  } else {
    prepared = strOrObj;
  }

  if (typeof prepared === 'string') {
    return truncate(prepared, limit);
  }

  if (typeof prepared !== 'object' || prepared === null) {
    return prepared as string | Record<string, unknown>;
  }

  if (JSON.stringify(prepared).length <= limit) {
    return prepared as Record<string, unknown>;
  }

  const limitForValues = limit > 1000 ? limit / 100 : 10;
  let replaced = replaceValues(structuredClone(prepared), limitForValues);
  if (JSON.stringify(replaced).length <= limit) return replaced;

  let nextLimit = limitForValues / 10;
  while (nextLimit > 9) {
    replaced = replaceValues(structuredClone(prepared), nextLimit);
    if (JSON.stringify(replaced).length <= limit) return replaced;
    nextLimit /= 10;
  }

  return JSON.stringify(replaced).substring(0, limit);
};

/**
 * Truncate a single string value.
 */
function truncate(value: string, limit: number): string {
  return value.length > limit ? `${value.substring(0, limit - ENDING.length)}${ENDING}` : value;
}

/**
 * Recursively truncate every string value found within an object or array.
 */
function replaceValues(value: unknown, limit: number): any {
  if (Array.isArray(value)) return value.map((item) => replaceValues(item, limit));
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      (value as Record<string, unknown>)[key] = replaceValues((value as Record<string, unknown>)[key], limit);
    }
    return value;
  }
  return typeof value === 'string' ? truncate(value, limit) : value;
}
