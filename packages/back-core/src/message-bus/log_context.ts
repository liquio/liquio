import { LogContext } from './types';

const MAX_STRING_LENGTH = 128;
const MAX_KEYS = 20;
const DROPPED_KEYS = new Set(['body', 'payload', 'message', 'messageString']);

function isLoggable(value: unknown): value is string | number | boolean {
  if (typeof value === 'string') return value.length > 0 && value.length <= MAX_STRING_LENGTH;
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'boolean';
}

/**
 * Pick the listed top-level fields that are safe to log.
 * @param {unknown} payload Message payload.
 * @param {string[]} fields Field names.
 * @returns {object} Scalar values only.
 */
export function pickLogFields(payload: unknown, fields: readonly string[]): LogContext {
  const result: LogContext = {};
  try {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return result;
    for (const field of fields) {
      if (!Object.prototype.hasOwnProperty.call(payload, field)) continue;
      const value = (payload as Record<string, unknown>)[field];
      if (isLoggable(value)) result[field] = value;
    }
  } catch {
    return {};
  }
  return result;
}

/**
 * Reduce an arbitrary extractor result to a safe log context.
 * @param {unknown} value Extractor result.
 * @returns {object} Scalar values only, at most 20 keys.
 */
export function sanitizeLogContext(value: unknown): LogContext {
  const result: LogContext = {};
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
    let count = 0;
    for (const key of Object.keys(value)) {
      if (count >= MAX_KEYS) break;
      if (DROPPED_KEYS.has(key)) continue;
      const item = (value as Record<string, unknown>)[key];
      if (!isLoggable(item)) continue;
      result[key] = item;
      count++;
    }
  } catch {
    return {};
  }
  return result;
}

/**
 * Reduce an error to a name and code. Never exposes the message, stack or other properties.
 * @param {unknown} error Error or thrown value.
 * @returns {{name: string, code?: string|number}} Error reference.
 */
export function errorRef(error: unknown): { name: string; code?: string | number } {
  let name = 'NonError';
  let code: string | number | undefined;
  try {
    if (error instanceof Error) {
      name = 'Error';
      const errorName = error.name;
      if (typeof errorName === 'string' && errorName.length > 0 && errorName.length <= 64) name = errorName;
    }
    if (error && typeof error === 'object') {
      const errorCode = (error as { code?: unknown }).code;
      if (typeof errorCode === 'string' && errorCode.length <= 64 && /^[A-Za-z0-9_.:-]+$/.test(errorCode)) code = errorCode;
      else if (typeof errorCode === 'number' && Number.isFinite(errorCode)) code = errorCode;
    }
  } catch {
    // Ignore hostile getters.
  }
  return code === undefined ? { name } : { name, code };
}
