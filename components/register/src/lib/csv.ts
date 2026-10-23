const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Build a safe, always-quoted CSV cell.
 * String values starting with a spreadsheet formula trigger (= + - @ tab CR) are prefixed with a single quote (OWASP).
 * Real numbers (and booleans/bigint) are never prefixed, so negative numbers are not mangled.
 * Embedded quotes are doubled (RFC 4180).
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let text = String(value);
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
