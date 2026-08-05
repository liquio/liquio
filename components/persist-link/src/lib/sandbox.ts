// Import.
import crypto from 'node:crypto';

import _ from 'lodash';
import acorn from 'acorn';
import iconv from 'iconv-lite';
import moment from 'moment';
import vm from 'isolated-vm';

import { getLog as getAppLog } from './context';
import { transformFunctionToAsync } from './helpers';

class Sandbox {
  /**
   * @param {object} config Sandbox configuration.
   */
  constructor(config) {
    this.config = config || {};

    // Create an isolation container
    this.isolate = new vm.Isolate({ memoryLimit: 128 });

    // Create a new context and import the default globals
    this.defaultGlobals = {
      _,
      iconv,
      moment,
      uuid: crypto.randomUUID,
      uuidv4: crypto.randomUUID,
      getMd5Hash,
      getSha512Hash,
      base64Decode,
      base64Encode,
      toBase64,
      crypto,
      global: {},
    };

    // Create a map to cache evaluated functions
    this.cache = new Map();
  }

  createContext() {
    return new SandboxContext(this);
  }

  addGlobal(name, value) {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Global name must be a non-empty string');
    }
    if (value === undefined) {
      throw new Error('Global value cannot be undefined');
    }
    if (this.defaultGlobals[name] !== undefined) {
      throw new Error(`Global "${name}" already exists`);
    }
    this.defaultGlobals[name] = value;
    return this;
  }

  /**
   * Minify code by stripping comments and whitespace.
   * @param {string} code - The code to minify.
   * @returns {string} - Minified code without comments.
   */
  static minifyCode(code) {
    return code
      .replace(/^\s*\/\/.*$/gm, '') // Remove single-line comments starting from the line beginning
      .replace(/^\s*\/\*[\s\S]*?\*\//gm, '') // Remove multi-line comments starting from the line beginning
      .trim();
  }

  /**
   * @typedef {object} EvalOptions
   * @property {object} [global] - Global context functions.
   * @property {boolean} [isAsync] - Evaluate code as async function.
   * @property {boolean} [throwOnUndefined] - Throw error if code is undefined.
   * @property {boolean} [throwIfNotFunction] - Throw error if code is not a function.
   * @property {boolean} [checkArrow] - Check for arrow functions, return raw string if not.
   * @property {any} [defaultValue] - Default value to return if code is empty.
   * @property {object} [meta] - Meta data for logging.
   */

  /**
   * Evaluate code within a sandbox.
   * @param {string} code Code to execute.
   * @param {EvalOptions} options
   * @returns {any} Result.
   */
  eval(code, options = {}) {
    if (typeof code !== 'string' || code.length === 0) {
      return options.defaultValue;
    }

    const hash = crypto.createHash('sha1').update(code).update(JSON.stringify(options)).digest('base64url');
    if (this.cache.has(hash)) {
      return this.cache.get(hash);
    }

    options.global ??= {};

    let transformedCode = Sandbox.minifyCode(code);

    const globalContext = { ...this.defaultGlobals, ...options.global, log: createSandboxLog({ ...options.meta, hash }) };
    const keys = Object.keys(globalContext);
    const values = Object.values(globalContext);

    if (options.isAsync) {
      const asyncFunctions = Object.entries(globalContext)
        .filter(([, value]) => {
          return typeof value === 'function' && value.constructor.name === 'AsyncFunction';
        })
        .map(([key]) => key);

      transformedCode = transformFunctionToAsync(transformedCode, asyncFunctions);
    }

    // Setup function with global context pulled from options.
    const fn = new Function(...keys, `return ${transformedCode}`)(...values);
    this.cache.set(hash, fn);
    return fn;
  }

  /**
   * Evaluate and run code with arguments within a sandbox.
   * @param {string} code Code to execute.
   * @param {any[]} args Arguments.
   * @param {EvalOptions} options Additional evaluation options.
   * @returns {any} Result.
   */
  evalWithArgs(code, args, options = {}) {
    const meta = options.meta ?? {};

    if (code === undefined && 'defaultValue' in options) {
      return options.defaultValue;
    } else if (code === undefined && options.throwOnUndefined) {
      throw this.throwError(new Error('Code is undefined'), code, meta);
    } else if (code === undefined) {
      return undefined;
    }

    try {
      const time = Date.now();

      let isArrowFunction, arrowParams, acornError;
      try {
        const { body } = acorn.parse(code, { ecmaVersion: 2020 });
        if (body[0].type === 'ExpressionStatement' && body[0].expression.type === 'ArrowFunctionExpression') {
          isArrowFunction = true;
          arrowParams = body[0].expression.params.map((param) => param.name);
          if (isArrowFunction && Array.isArray(arrowParams)) {
            args = args.slice(0, arrowParams.length);
          }
        }
      } catch (error) {
        acornError = error;
      }

      if (options.checkArrow && !isArrowFunction) {
        return code;
      } else if (acornError) {
        throw acornError;
      }

      const fn = this.eval(code, options);

      if (typeof fn !== 'function') {
        if (!options.checkArrow) {
          getAppLog().save('sandbox-warning', { ...meta, error: 'Function not found', acornError, code }, 'warn');
        }
        return fn;
      }

      if (this.config.logging) {
        const result = fn(...args);
        getAppLog().save('sandbox-eval', { ...meta, isArrowFunction, arrowParams, duration: Date.now() - time });
        return result;
      } else {
        return fn(...args);
      }
    } catch (error) {
      throw this.throwError(error, code, meta);
    }
  }

  throwError(error, code, meta) {
    getAppLog().save('sandbox-error', { ...meta, error: error.message, code }, 'error');

    let errorMessage = `Sandbox error: "${error.message}"`;
    if (meta.fn) {
      errorMessage += ` in ${meta.fn}`;
    }
    if (meta.caller) {
      errorMessage += ` called by ${meta.caller}`;
    }

    if (error.loc) {
      const excerpt = code.split('\n')[error.loc.line - 1];
      errorMessage += `\n  ${excerpt}\n  ${' '.repeat(error.loc.column)}^`;
    }

    return new Error(errorMessage);
  }
}

class SandboxContext {
  constructor(sandbox) {
    this.sandbox = sandbox;
    this.context = sandbox.isolate.createContextSync();
    this.jail = this.context.global;
  }

  set(name, value) {
    this.jail.setSync(name, new vm.Reference(value));
    return this;
  }

  eval(code) {
    return this.context.evalSync(code);
  }
}

/**
 * Log data from sandbox.
 * @param {object} data Data to log.
 * @returns {void}
 */
function createSandboxLog(meta) {
  return function (data) {
    getAppLog().save('sandbox-log', { data, meta }, 'info');
  };
}

/**
 * Get md5 hash.
 * @param {string} data Data.
 * @returns {string}
 */
function getMd5Hash(data) {
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Get sha512 hash.
 * @param {string} data Data.
 * @param {GetSha512HashOptions} [options] Options.
 * @returns {string}
 *
 * @typedef {object} GetSha512HashOptions
 * @property {string} [hmac] HMAC secret.
 */
function getSha512Hash(data, options) {
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
function base64Decode(data) {
  return Buffer.from(data, 'base64').toString('utf8');
}

/**
 * Base64 encode.
 * @param {string} rawString RAW string.
 * @param {'utf8'|'hex'} [rawStringEncoding] RAW string encoding. Default value: `utf8`.
 * @returns {string} Base64 string.
 */
function base64Encode(rawString = '', rawStringEncoding = 'utf8') {
  return Buffer.from(rawString, rawStringEncoding).toString('base64');
}

/**
 * Convert data to base64.
 * @param {string} data Data.
 * @returns {string} Base64 string.
 */
function toBase64(data) {
  return Buffer.from(data).toString('base64');
}

export default Sandbox;
