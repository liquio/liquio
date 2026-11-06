export const UNSAFE_KEY_NAMES = ['__proto__', 'constructor', 'prototype'];
export const MAX_DATA_KEY_LENGTH = 256;
export const MAX_DATA_DEPTH = 64;
const MAX_REPORTED_KEY_LENGTH = 64;
const FORBIDDEN_KEY_CHARS = /[{}<>"'`$^|\\\u0000-\u001f\u007f]/;

export const isUnsafePathSegment = (segment: string): boolean => UNSAFE_KEY_NAMES.includes(segment);

export const isUnsafeDataKey = (key: string): boolean =>
  UNSAFE_KEY_NAMES.includes(key) || key.length > MAX_DATA_KEY_LENGTH || FORBIDDEN_KEY_CHARS.test(key);

const truncateKey = (key: string): string => (key.length > MAX_REPORTED_KEY_LENGTH ? `${key.slice(0, MAX_REPORTED_KEY_LENGTH)}…` : key);

/**
 * Returns dotted paths of unsafe own keys inside `value` (at most `limit`), never the values.
 * Arrays are walked by index (indexes are not checked as keys). Depth over MAX_DATA_DEPTH is reported as `<basePath> (too deep)` once.
 * @param value Value to check.
 * @param basePath Base path.
 * @param limit Max results.
 * @returns Unsafe key paths.
 */
export function findUnsafeDataKeys(value: unknown, basePath: string, limit = 10): string[] {
  const result: string[] = [];
  const stack: { node: unknown; path: string; depth: number }[] = [{ node: value, path: basePath, depth: 0 }];
  let tooDeepReported = false;

  while (stack.length > 0 && result.length < limit) {
    const { node, path, depth } = stack.pop()!;
    if (node === null || typeof node !== 'object') {
      continue;
    }
    if (depth > MAX_DATA_DEPTH) {
      if (!tooDeepReported) {
        tooDeepReported = true;
        result.push(`${path} (too deep)`);
      }
      continue;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => stack.push({ node: item, path: `${path}.${index}`, depth: depth + 1 }));
      continue;
    }
    for (const key of Object.keys(node)) {
      const keyPath = `${path}.${truncateKey(key)}`;
      if (isUnsafeDataKey(key)) {
        result.push(keyPath);
        if (result.length >= limit) {
          break;
        }
      }
      stack.push({ node: (node as Record<string, unknown>)[key], path: keyPath, depth: depth + 1 });
    }
  }

  return result;
}
