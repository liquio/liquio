import vm from 'isolated-vm';
import iconv from 'iconv-lite';
import moment from 'moment';
import _ from 'lodash';
import * as crypto from 'node:crypto';
import acorn from 'acorn';
import { literal } from 'sequelize';
import { LRUCache } from 'lru-cache';

import { getTraceMeta } from './async_local_storage';

const { randomUUID } = crypto;

const DEFAULT_GLOBAL_FUNCTIONS_OBJECT = '$';
const DEFAULT_LRU_MAX = 1000; // 1000 items

/**
 * Minimal structural shape for the log object each component exposes on `global.log`.
 * Consumers may instead pass a `getLog` function in the sandbox config to avoid
 * depending on a process-wide global.
 */
export interface SandboxLog {
  save(event: string, data: Record<string, any>, level?: string): void;
}

export interface SandboxConfig {
  /** Name of the object that exposes workflow template global functions inside evaluated code. Default: '$'. */
  globalFunctionsObject?: string;
  /** Max number of compiled functions to keep in the eval cache. Default: 1000. */
  lru_max?: number;
  /** Log every eval/evalWithArgs call (in addition to warnings/errors, which are always logged). */
  logging?: boolean;
  /** Returns the logger to use. Defaults to reading `global.log`. */
  getLog?: () => SandboxLog;
  [key: string]: any;
}

export interface EvalOptions {
  /** Extra globals to expose to the evaluated code, merged over the sandbox defaults. */
  global?: Record<string, any>;
  /** Evaluate code as an async function, awaiting any async globals it calls. */
  isAsync?: boolean;
  /** Throw an error if code is undefined. */
  throwOnUndefined?: boolean;
  /** Check for arrow functions; return the raw code string if it isn't one. */
  checkArrow?: boolean;
  /** Workflow template ID whose global functions should be exposed as `$.workflow`. */
  workflowTemplateId?: string | number;
  /** Default value to return if code is empty/undefined. */
  defaultValue?: any;
  /** Meta data for logging. */
  meta?: Record<string, any>;
  [key: string]: any;
}

/**
 * Sandbox for evaluating user-provided (low-code) JavaScript snippets outside of a full
 * isolated-vm context, plus a factory for true `isolated-vm` contexts via `createContext()`.
 *
 * Consolidates the near-identical `Sandbox` implementations previously duplicated across
 * the task, admin-api, event, gateway, and persist-link components.
 */
export class Sandbox {
  private static singleton: Sandbox;

  config: SandboxConfig;
  isolate: vm.Isolate;
  globalFunctionsObject: string;
  defaultGlobals: Record<string, any>;
  cache: LRUCache<string, any>;
  workflowTemplateFunctions: Record<string | number, Record<string, any>>;

  /**
   * Get the singleton instance of the Sandbox.
   * @returns {Sandbox}
   */
  static getInstance(): Sandbox {
    if (!Sandbox.singleton) {
      throw new Error('Sandbox is not initialized.');
    }
    return Sandbox.singleton;
  }

  /**
   * @param {SandboxConfig} config Sandbox configuration.
   */
  constructor(config?: SandboxConfig) {
    this.config = config || {};

    // Create an isolation container
    this.isolate = new vm.Isolate({ memoryLimit: 128 });

    // Set the global functions object, default is '$'
    this.globalFunctionsObject = this.config.globalFunctionsObject || DEFAULT_GLOBAL_FUNCTIONS_OBJECT;

    // Create a new context and import the default globals
    this.defaultGlobals = {
      _,
      iconv,
      moment,
      crypto,
      randomUUID,
      uuid: randomUUID,
      uuidv4: randomUUID,
      getMd5Hash,
      getSha256Hash,
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

  /**
   * Register a new default global for evaluated code. Fails if the name is already taken,
   * so components don't silently shadow one of the built-in helpers or each other's globals.
   * @param {string} name Global name.
   * @param {any} value Global value.
   * @returns {Sandbox}
   */
  addGlobal(name: string, value: any): Sandbox {
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
   * Load workflow template global functions from the database into the sandbox.
   * @param {object} models Sequelize models container exposing `models.workflowTemplate`.
   * @returns {Promise<void>}
   */
  async init(models: any): Promise<void> {
    if (!models?.models?.workflowTemplate) {
      throw new Error('Models are required to initialize the sandbox.');
    }

    // Select all workflow templates that have global functions defined in their data.
    const workflowTemplates = await models.models.workflowTemplate.model.findAll({
      where: literal("data::jsonb ? 'globalFunctions'"),
      attributes: ['id', 'data'],
    });

    // Iterate through each workflow template and extract global functions.
    for (const workflowTemplate of workflowTemplates) {
      const globalFunctions = workflowTemplate.data?.globalFunctions || {};

      if (typeof globalFunctions !== 'object') {
        this.getLog().save(
          'sandbox-warning',
          {
            workflowTemplateId: workflowTemplate.id,
            message: 'Invalid globalFunctions for workflow template, must be an object.',
            data: workflowTemplate.data,
          },
          'warn',
        );
        continue;
      }

      this.updateWorkflowTemplateFunctions(workflowTemplate.id, globalFunctions);
    }
  }

  /**
   * Compile and store the global functions of a single workflow template.
   * @param {string|number} workflowTemplateId Workflow template ID.
   * @param {object} globalFunctions Map of function name to function source code.
   */
  updateWorkflowTemplateFunctions(workflowTemplateId: string | number, globalFunctions: Record<string, any>): void {
    // Filter out empty strings.
    const pairs = Object.entries(globalFunctions || {}).filter(([, v]) => {
      return typeof v === 'string' && v.length > 0;
    }) as [string, string][];

    // Iterate over each global function and save it to the instance store.
    for (const [functionName, functionCode] of pairs) {
      this.workflowTemplateFunctions[workflowTemplateId] ??= {};

      try {
        this.workflowTemplateFunctions[workflowTemplateId][functionName] = this.eval(functionCode, {
          isAsync: functionCode.trim().startsWith('async'),
        });

        this.getLog().save(
          'sandbox-global-function',
          {
            workflowTemplateId,
            functionName,
          },
          'info',
        );
      } catch (error: any) {
        this.getLog().save(
          'sandbox-global-function-error',
          {
            workflowTemplateId,
            functionName,
            error: error.message,
            code: functionCode,
          },
          'warn',
        );
      }
    }
  }

  /**
   * Create a true `isolated-vm` context bound to this sandbox's isolate.
   * @returns {SandboxContext}
   */
  createContext(): SandboxContext {
    return new SandboxContext(this);
  }

  /**
   * Minify code by stripping comments and whitespace.
   * @param {string} code - The code to minify.
   * @returns {string} - Minified code without comments.
   */
  static minifyCode(code: string): string {
    return code
      .replace(/^\s*\/\/.*$/gm, '') // Remove single-line comments starting from the line beginning
      .replace(/^\s*\/\*[\s\S]*?\*\//gm, '') // Remove multi-line comments starting from the line beginning
      .trim();
  }

  /**
   * Evaluate code within a sandbox.
   * @param {string} code Code to execute.
   * @param {EvalOptions} options
   * @returns {any} Result.
   */
  eval(code: string, options: EvalOptions = {}): any {
    const meta = getTraceMeta() || {};

    if (typeof code !== 'string' || code.length === 0) {
      return options.defaultValue;
    }

    const hash = crypto.createHash('sha1').update(code).update(JSON.stringify(options)).digest('base64url');
    if (this.cache.has(hash)) {
      return this.cache.get(hash);
    }

    options.global ??= {};
    options.global[this.globalFunctionsObject] = { workflow: {} };
    options.global.log = this.getSandboxLog({ ...options.meta, hash, workflowTemplateId: options.workflowTemplateId });

    // Add workflow template global functions to the execution context.
    const workflowTemplateId = options.workflowTemplateId || meta.workflowTemplateId;
    if (workflowTemplateId) {
      options.global[this.globalFunctionsObject].workflow = {
        ...this.workflowTemplateFunctions[workflowTemplateId],
      };
    }

    const globalContext = { ...this.defaultGlobals, ...options.global };

    let transformedCode = Sandbox.minifyCode(code);
    if (options.isAsync) {
      const asyncFunctions = Object.entries(globalContext)
        .filter(([, value]) => {
          return typeof value === 'function' && (value as any).constructor.name === 'AsyncFunction';
        })
        .map(([key]) => key);

      transformedCode = transformFunctionToAsync(transformedCode, asyncFunctions);
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
  evalWithArgs(code: string | undefined, args?: any[], options: EvalOptions = {}): any {
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
      if (options.isAsync && code.trim().startsWith('(') && !code.trim().startsWith('async') && /\bawait\b/.test(code)) {
        code = `async ${code}`;
      }

      let isArrowFunction, arrowParams, acornError;
      try {
        const { body } = acorn.parse(code, { ecmaVersion: 2020 }) as any;
        if (body[0].type === 'ExpressionStatement' && body[0].expression.type === 'ArrowFunctionExpression') {
          isArrowFunction = true;
          arrowParams = body[0].expression.params.map((param: any) => param.name);
          if (isArrowFunction && Array.isArray(arrowParams) && args) {
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
          this.getLog().save('sandbox-warning', { ...meta, error: 'Function not found', acornError, code }, 'warn');
        }
        return fn;
      }

      if (this.config.logging) {
        const result = fn(...(args || []));
        this.getLog().save('sandbox-eval', { ...meta, isArrowFunction, arrowParams, duration: Date.now() - time });
        return result;
      } else {
        return fn(...(args || []));
      }
    } catch (error) {
      throw this.throwError(error, code, meta);
    }
  }

  throwError(error: any, code: any, meta: any): Error {
    this.getLog().save('sandbox-error', { ...meta, error: error.message, code }, 'error');

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

  /**
   * Resolve the logger to use, defaulting to `global.log` for backwards compatibility
   * with components that set it up as a process-wide singleton.
   * @returns {SandboxLog}
   */
  private getLog(): SandboxLog {
    if (this.config.getLog) {
      return this.config.getLog();
    }
    return (global as any).log;
  }

  private getSandboxLog(meta: Record<string, any>): (data: any) => void {
    return (data: any) => {
      this.getLog().save('sandbox-log', { data, meta }, 'info');
    };
  }
}

export class SandboxContext {
  sandbox: Sandbox;
  context: vm.Context;
  jail: vm.Reference;

  constructor(sandbox: Sandbox) {
    this.sandbox = sandbox;
    this.context = sandbox.isolate.createContextSync();
    this.jail = this.context.global;
  }

  set(name: string, value: any): SandboxContext {
    this.jail.setSync(name, new vm.Reference(value));
    return this;
  }

  eval(code: string): any {
    return this.context.evalSync(code);
  }
}

/**
 * Transform a function's source to `async`, awaiting calls to any of the given async
 * globals so a caller can pass a synchronous-looking arrow function that calls async
 * helpers without having to write `async`/`await` itself.
 * @param {string} functionString Function source code.
 * @param {string[]} allowedAsyncFunctions Names of async globals referenced by the function.
 * @returns {string} Transformed function source.
 */
function transformFunctionToAsync(functionString: string, allowedAsyncFunctions: string[] = []): string {
  const isFunctionStringContainsAsyncFunction = allowedAsyncFunctions.some(
    (v) => functionString.includes(v) && !functionString.includes(`await ${v}`),
  );

  // Return as is if async function not used.
  if (!isFunctionStringContainsAsyncFunction) {
    return functionString;
  }

  // Transform to async.
  let asyncFunctionString = functionString;
  if (!asyncFunctionString.startsWith('async')) {
    asyncFunctionString = `async ${asyncFunctionString}`;
  }
  for (const asyncFunctionInside of allowedAsyncFunctions) {
    asyncFunctionString = asyncFunctionString.replace(new RegExp(`(?<!\\.)\\b${asyncFunctionInside}\\b`, 'g'), `await ${asyncFunctionInside}`);
  }

  return asyncFunctionString;
}

/**
 * Get md5 hash.
 * @param {string} data Data.
 * @returns {string}
 */
function getMd5Hash(data: string): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Get sha256 hash.
 * @param {string} data Data.
 * @returns {string}
 */
function getSha256Hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get sha512 hash.
 * @param {string} data Data.
 * @param {object} [options] Options.
 * @param {string} [options.hmac] HMAC secret.
 * @returns {string}
 */
function getSha512Hash(data: string, options?: { hmac?: string }): string {
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
function base64Decode(data: string): string {
  return Buffer.from(data, 'base64').toString('utf8');
}

/**
 * Base64 encode.
 * @param {string} rawString RAW string.
 * @param {BufferEncoding} [rawStringEncoding] RAW string encoding. Default value: `utf8`.
 * @returns {string} Base64 string.
 */
function base64Encode(rawString: string = '', rawStringEncoding: BufferEncoding = 'utf8'): string {
  return Buffer.from(rawString, rawStringEncoding).toString('base64');
}

/**
 * Convert data to base64.
 * @param {string} data Data.
 * @returns {string} Base64 string.
 */
function toBase64(data: string): string {
  return Buffer.from(data).toString('base64');
}
