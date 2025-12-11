const vm = require('isolated-vm');
const iconv = require('iconv-lite');
const moment = require('moment');
const _ = require('lodash');
const crypto = require('crypto');
const acorn = require('acorn');
const uuid = require('uuid-random');
const { literal } = require('sequelize');
const { LRUCache } = require('lru-cache');

const { getTraceMeta } = require('../lib/async_local_storage');
const { transformFunctionToAsync } = require('./helpers');

const DEFAULT_GLOBAL_FUNCTIONS_OBJECT = '$';
const DEFAULT_LRU_MAX = 1000; // 1000 items

class Sandbox {
  static singleton;

  /**
   * Get the singleton instance of the Sandbox.
   * @returns {Sandbox}
   */
  static getInstance() {
    if (!Sandbox.singleton) {
      throw new Error('Sandbox is not initialized.');
    }
    return Sandbox.singleton;
  }

  /**
   * @param {object} config Sandbox configuration.
   */
  constructor(config) {
    this.config = config || {};

    // Create an isolation container
    this.isolate = new vm.Isolate({ memoryLimit: 128 });

    // Set the global functions object, default is '$'
    this.globalFunctionsObject = config?.globalFunctionsObject || DEFAULT_GLOBAL_FUNCTIONS_OBJECT;

    // Create a new context and import the default globals
    this.defaultGlobals = {
      _,
      iconv,
      moment,
      uuid,
      getMd5Hash,
      getSha512Hash,
      base64Decode,
      base64Encode,
      toBase64,
      global: {},
    };

    // Create a cache for evaluated functions
    this.cache = new LRUCache({ max: this.config.lru_max ?? DEFAULT_LRU_MAX });

    // A store for workflow template global functions
    this.workflowTemplateFunctions = {};

    Sandbox.singleton = this;
  }

  async init(models) {
    if (!models?.models?.workflowTemplate) {
      throw new Error('Models are required to initialize the sandbox.');
    }

    // Select all workflow templates that have global functions defined in their data.
    const workflowTemplates = await models.models.workflowTemplate.model.findAll({
      where: literal('data::jsonb ? \'globalFunctions\''),
      attributes: ['id', 'data'],
    });

    // Iterate through each workflow template and extract global functions.
    for (const workflowTemplate of workflowTemplates) {
      const globalFunctions = workflowTemplate.data?.globalFunctions || {};

      if (typeof globalFunctions !== 'object') {
        global.log.save('sandbox-warning', {
          workflowTemplateId: workflowTemplate.id,
          message: 'Invalid globalFunctions for workflow template, must be an object.',
          data: workflowTemplate.data,
        }, 'warn');
        continue;
      }

      this.updateWorkflowTemplateFunctions(
        workflowTemplate.id,
        workflowTemplate.data?.globalFunctions || {},
      );
    }
  }

  updateWorkflowTemplateFunctions(workflowTemplateId, globalFunctions) {
    // Filter out empty strings.
    const pairs = Object.entries(
      globalFunctions || {},
    ).filter(([, v]) => {
      return typeof v === 'string' && v.length > 0;
    });

    // Iterate over each global function and save it to the instance store.
    for (const [functionName, functionCode] of pairs) {
      this.workflowTemplateFunctions[workflowTemplateId] ??= {};

      try {
        this.workflowTemplateFunctions[workflowTemplateId][functionName] = this.eval(
          functionCode,
          { isAsync: functionCode.trim().startsWith('async') },
        );

        global.log.save('sandbox-global-function', {
          workflowTemplateId,
          functionName,
        }, 'info');
      } catch (error) {
        global.log.save('sandbox-global-function-error', {
          workflowTemplateId,
          functionName,
          error: error.message,
          code: functionCode,
        }, 'warn');
      }
    }
  }

  createContext() {
    return new SandboxContext(this);
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
   * @property {number} [workflowTemplateId] - Workflow template ID for global functions.
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
    const meta = getTraceMeta() || {};

    if (typeof code !== 'string' || code.length === 0) {
      return options.defaultValue;
    }

    const hash = crypto.createHash('sha1')
      .update(code)
      .update(JSON.stringify(options))
      .digest('base64url');
    if (this.cache.has(hash)) {
      return this.cache.get(hash);
    }

    options.global ??= {};
    options.global[this.globalFunctionsObject] = { workflow: {} };
    options.global.log = getLog({ ...options.meta, hash, workflowTemplateId: options.workflowTemplateId });

    // Add workflow template global functions to the execution context.
    const workflowTemplateId = options.workflowTemplateId || meta.workflowTemplateId;
    if (workflowTemplateId) {
      options.global[this.globalFunctionsObject].workflow = {
        ...this.workflowTemplateFunctions[workflowTemplateId]
      };
    }

    const globalContext = { ...this.defaultGlobals, ...options.global };

    let transformedCode = Sandbox.minifyCode(code);
    if (options.isAsync) {
      const asyncFunctions = Object.entries(globalContext)
        .filter(([, value]) => {
          return (
            typeof value === 'function' &&
            value.constructor.name === 'AsyncFunction'
          );
        })
        .map(([key]) => key);

      transformedCode = transformFunctionToAsync(
        transformedCode,
        asyncFunctions,
      );
    }
    
    // Setup function with global context pulled from options.
    const keys = Object.keys(globalContext);
    const values = Object.values(globalContext);
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

    // Copy workflowTemplateId to meta if it exists in options.
    if (options.workflowTemplateId && !meta.workflowTemplateId) {
      meta.workflowTemplateId = options.workflowTemplateId;
    }

    try {
      const time = Date.now();

      // Temporary fix for old low code snippets.
      if (
        options.isAsync &&
        code.trim().startsWith('(') &&
        !code.trim().startsWith('async') &&
        /\bawait\b/.test(code)
      ) {
        code = `async ${code}`;
      }

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
          global.log.save('sandbox-warning', { ...meta, error: 'Function not found', acornError, code }, 'warn');
        }
        return fn;
      }

      if (this.config.logging) {
        const result = fn(...args);
        global.log.save('sandbox-eval', { ...meta, isArrowFunction, arrowParams, duration: Date.now() - time });
        return result;
      } else {
        return fn(...args);
      }
    } catch (error) {
      throw this.throwError(error, code, meta);
    }
  }

  throwError(error, code, meta) {
    global.log.save('sandbox-error', { ...meta, error: error.message, code }, 'error');

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
function getLog(meta) {
  return function (data) {
    global.log.save('sandbox-log', { data, meta }, 'info');
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

module.exports = Sandbox;
