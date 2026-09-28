import * as crypto from 'node:crypto';

import { ASYNC_BRIDGE_MARKER, AsyncBridgeFunction } from './interfaces';

export const { randomUUID } = crypto;

/**
 * Whether a function value is (or behaves like) an `AsyncFunction`. TypeScript targets at or
 * below ES2016 (this repo builds at ES6) downlevel `async`/`await` into a plain function
 * wrapping a generator via the `__awaiter` helper, which loses the native `AsyncFunction`
 * constructor — so a TypeScript-authored async global doesn't pass a bare `constructor.name`
 * check. Detect that shape from its source text as a fallback, alongside `ASYNC_BRIDGE_MARKER`.
 * @param {unknown} value Value to check.
 * @returns {boolean}
 */
export function isAsyncFunctionValue(value: unknown): boolean {
  if (typeof value !== 'function') return false;
  if (value.constructor?.name === 'AsyncFunction') return true;
  if ((value as AsyncBridgeFunction)[ASYNC_BRIDGE_MARKER] === true) return true;
  return /\b__awaiter\(/.test(Function.prototype.toString.call(value));
}

/** Structural shape of a thrown value that looks like an `Error` (has a string `.message`,
 * and optionally a parser-style `.loc`), without requiring `instanceof Error` — a real `Error`
 * thrown inside an `isolated-vm` isolate crosses back as an object of this shape but belongs to
 * a different V8 realm, so `instanceof` against the host's own `Error` constructor fails.
 * @param {unknown} error Value to check.
 * @returns {boolean}
 */
export function isErrorLike(error: unknown): error is { message: string; loc?: { line: number; column: number } } {
  return typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string';
}

/**
 * Get md5 hash.
 * @param {string} data Data.
 * @returns {string}
 */
export function getMd5Hash(data: string): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Get sha256 hash.
 * @param {string} data Data.
 * @returns {string}
 */
export function getSha256Hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get sha512 hash.
 * @param {string} data Data.
 * @param {object} [options] Options.
 * @param {string} [options.hmac] HMAC secret.
 * @returns {string}
 */
export function getSha512Hash(data: string, options?: { hmac?: string }): string {
  if (options?.hmac) {
    return crypto.createHmac('sha512', options.hmac).update(data).digest('hex');
  }
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * Base64 decode.
 * @param {string} data Base64 string.
 * @returns {string} RAW string.
 */
export function base64Decode(data: string): string {
  return Buffer.from(data, 'base64').toString('utf8');
}

/**
 * Base64 encode.
 * @param {string} rawString RAW string.
 * @param {BufferEncoding} [rawStringEncoding] RAW string encoding. Default value: `utf8`.
 * @returns {string} Base64 string.
 */
export function base64Encode(rawString: string = '', rawStringEncoding: BufferEncoding = 'utf8'): string {
  return Buffer.from(rawString, rawStringEncoding).toString('base64');
}

/**
 * Convert data to base64.
 * @param {string} data Data.
 * @returns {string} Base64 string.
 */
export function toBase64(data: string): string {
  return Buffer.from(data).toString('base64');
}
