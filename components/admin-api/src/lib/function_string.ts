const FUNCTION_EXPRESSION_REGEXP = /^\s*(async\s+)?function\b/;
const ARROW_FUNCTION_REGEXP = /^\s*(async\s+)?(\((?:[^()]|\([^()]*\))*\)|[\w$]+)\s*=>/;

/**
 * Check if the value is a function source string like `() => 123` or `function () { return 123; }`.
 * Detects by syntax only, the value is never evaluated.
 * @param {*} value Value to check.
 * @returns {boolean} Is function string.
 */
export function isFunctionString(value: unknown): boolean {
  return typeof value === 'string' && (FUNCTION_EXPRESSION_REGEXP.test(value) || ARROW_FUNCTION_REGEXP.test(value));
}
