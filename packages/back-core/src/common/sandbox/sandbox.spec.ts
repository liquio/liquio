import * as childProcess from 'node:child_process';

import hostIconv from 'iconv-lite';
import hostMoment from 'moment';

import { appendTraceMeta, runInAsyncLocalStorage } from '../async_local_storage';
import { Sandbox, SandboxIsolationLevel } from './index';

const log = { save: jest.fn() };

/**
 * Run a script in a plain Node.js child process with `Sandbox` in scope (`index.ts` is loaded through a TypeScript
 * require hook). Used for checks jest can't make in-process: exhausting memory can abort the whole process (and with
 * it the jest worker), and jest 30 runs tests in a `vm` context whose global object doesn't throw on assignment to an
 * undeclared name in strict mode.
 * @param {string} body Script body.
 * @returns {childProcess.SpawnSyncReturns<string>}
 */
function runInChildProcess(body: string): childProcess.SpawnSyncReturns<string> {
  const script = `
    const ts = require(${JSON.stringify(require.resolve('typescript'))});
    require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(require('fs').readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
    global.log = { save() {} };
    const { Sandbox } = require(${JSON.stringify(require.resolve('./index'))});
    ${body}
  `;
  return childProcess.spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 60000 });
}

describe.each(Object.values(SandboxIsolationLevel))('Sandbox (isolationLevel: %s)', (isolationLevel) => {
  const config = { isolationLevel, getLog: () => log };
  const isFunctionLevel = isolationLevel === SandboxIsolationLevel.Function;
  // `guardCode` applies on both levels. Guarded lodash/Object belong to the `function` level only: the isolate has
  // its own `_`/`Object` without host access (see ./isolated.spec.ts).
  const describeFunctionLevel = (name, fn) => isFunctionLevel && describe(name, fn);

  beforeEach(() => {
    log.save.mockClear();
  });

  it('should execute a simple code', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.eval('1 + 1');
    expect(result).toBe(2);
  });

  it('should execute a code with arguments', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.evalWithArgs('(a, b) => a + b', [1, 2]);
    expect(result).toBe(3);
  });

  it('should return the default value if code is empty', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.eval('', { defaultValue: 42 });
    expect(result).toBe(42);
  });

  it('should cleanup comments and trim code', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.eval('\n/* comment */\n 1 + 1 // comment');
    expect(result).toBe(2);
  });

  describe('isFunctionLiteral', () => {
    [
      '(a) => a',
      '({ userInfo }) => ({ first_name: userInfo.firstName })',
      'async (a) => a',
      '(function (a) { return a; })',
      '\n/* comment */ (a) => a // comment',
    ].forEach((code) => {
      it(`should accept function literal: ${JSON.stringify(code)}`, () => {
        expect(Sandbox.isFunctionLiteral(code)).toBe(true);
      });
    });

    [
      undefined,
      null,
      42,
      {},
      '',
      '   ',
      '1 + 1',
      "(function(){ throw new Error(require('os').hostname()) })()",
      '((a) => a)()',
      'process.exit(1)',
      'function foo() {}',
      'function (a) { return a; }',
      '(a) => a; process.exit(1)',
      '(a) => a,  process.exit(1)',
      '(a) => {',
    ].forEach((code) => {
      it(`should reject non-function literal: ${JSON.stringify(code)}`, () => {
        expect(Sandbox.isFunctionLiteral(code)).toBe(false);
      });
    });

    it('should not execute the checked code', () => {
      (global as any).__kycRceProbe = false;
      Sandbox.isFunctionLiteral('(function(){ global.__kycRceProbe = true; return () => 1; })()');
      expect((global as any).__kycRceProbe).toBe(false);
      delete (global as any).__kycRceProbe;
    });
  });

  it('should check for arrow functions and return raw string if not', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.evalWithArgs('1 + 1', [], { checkArrow: true });
    expect(result).toBe('1 + 1');
  });

  it('should check for arrow functions and return evaluated code if found', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.eval(' (a, b) => a + b', { checkArrow: true });
    expect(result).toBeInstanceOf(Function);
    expect(result(1, 2)).toBe(3);
  });

  it('should transform functions to async', async () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.evalWithArgs('(a) => test(a)', [42], {
      isAsync: true,
      global: { test: async (a) => a + 1 },
    });
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBe(43);
  });

  it('should prevent access to global reference', () => {
    (global as any).test = 'test';
    const sandbox = new Sandbox(config);
    const result = sandbox.eval('Object.keys(global)');
    expect(result).toEqual([]);
    sandbox.eval('global.test = "test2"');
    expect((global as any).test).toBe('test');
  });

  it('should not leak assignments to shadowed host globals', () => {
    const original = fetch.toString();
    const sandbox = new Sandbox(config);
    sandbox.eval('fetch = function() { return "fetch" }');
    expect(fetch.toString()).toBe(original);
  });

  // This is a known V8 sandbox escape technique that reaches the real `Function` constructor (and
  // through it the host realm) via the constructor of an array method. Shadowing host globals as
  // `undefined` parameters does not stop it, because the constructor chain walks prototypes rather
  // than resolving an identifier. The sandbox now blocks any `.constructor` access at compile time.
  it('should prevent containment breach via [].filter.constructor', () => {
    const sandbox = new Sandbox(config);
    expect(() => sandbox.evalWithArgs('() => { [].filter.constructor("require")() }', [])).toThrow(
      'Sandbox error: "Access to "constructor" is blocked"',
    );
  });

  // Prototype pollution is now blocked: `.prototype` access is rejected at compile time (before the
  // code ever runs) and a 'sandbox-alert' warning is still emitted so suspicious code is flagged.
  it('should block and alert when .prototype is accessed', () => {
    const sandbox = new Sandbox(config);
    const originalJoin = Array.prototype.join;
    try {
      expect(() => sandbox.evalWithArgs("() => { Array.prototype.join = () => 'pwned'; }", [])).toThrow(
        'Sandbox error: "Access to "prototype" is blocked"',
      );
      expect(Array.prototype.join).toBe(originalJoin);
    } finally {
      Array.prototype.join = originalJoin;
    }
    expect(log.save).toHaveBeenCalledWith('sandbox-alert', expect.objectContaining({ code: expect.stringContaining('.prototype') }), 'warn');
  });

  it('should route console output to the log', () => {
    const sandbox = new Sandbox(config);
    sandbox.evalWithArgs('() => { console.log("a", 1); console.warn("b"); console.error("c"); console.debug("d"); console.info("e"); }', []);
    expect(log.save).toHaveBeenCalledWith('sandbox-console', expect.objectContaining({ data: ['a', 1] }), 'info');
    expect(log.save).toHaveBeenCalledWith('sandbox-console', expect.objectContaining({ data: ['b'] }), 'warn');
    expect(log.save).toHaveBeenCalledWith('sandbox-console', expect.objectContaining({ data: ['c'] }), 'error');
    expect(log.save).toHaveBeenCalledWith('sandbox-console', expect.objectContaining({ data: ['d'] }), 'debug');
    expect(log.save).toHaveBeenCalledWith('sandbox-console', expect.objectContaining({ data: ['e'] }), 'info');
  });

  it('should use default globals', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.eval('getMd5Hash("test")');
    expect(result).toBe('098f6bcd4621d373cade4e832627b4f6');
  });

  it('should expose sha256, uuid and crypto helpers as default globals', () => {
    const sandbox = new Sandbox(config);
    expect(sandbox.eval('getSha256Hash("test")')).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    expect(sandbox.eval('typeof uuid()')).toBe('string');
    expect(sandbox.eval('typeof uuidv4()')).toBe('string');
    expect(sandbox.eval('typeof crypto.randomUUID')).toBe('function');
  });

  it('should compute a sha512 hash, with and without an hmac secret', () => {
    const sandbox = new Sandbox(config);
    expect(sandbox.eval('getSha512Hash("test")')).toBe(
      'ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff',
    );
    expect(sandbox.eval('getSha512Hash("test", { hmac: "secret" })')).toBe(
      'f8a4f0a209167bc192a1bffaa01ecdb09e06c57f96530d92ec9ccea0090d290e55071306d6b654f26ae0c8721f7e48a2d7130b881151f2cec8d61d941a6be88a',
    );
  });

  it('should encode/decode base64 helpers', () => {
    const sandbox = new Sandbox(config);
    expect(sandbox.eval('base64Encode("hello")')).toBe('aGVsbG8=');
    expect(sandbox.eval('base64Decode("aGVsbG8=")')).toBe('hello');
    expect(sandbox.eval('toBase64("hello")')).toBe('aGVsbG8=');
    expect(sandbox.eval('base64Decode(toBase64("round-trip"))')).toBe('round-trip');
  });

  it('should override globals if needed', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.eval('Object.keys(global)', {
      global: { global: { a: 1 } },
    });
    expect(result).toEqual(['a']);
  });

  it('should add a custom global via addGlobal', () => {
    const sandbox = new Sandbox(config);
    sandbox.addGlobal('double', (n) => n * 2);
    expect(sandbox.eval('double(21)')).toBe(42);
  });

  it('should throw when adding a global that already exists', () => {
    const sandbox = new Sandbox(config);
    expect(() => sandbox.addGlobal('_', {})).toThrow('Global "_" already exists');
  });

  it('should throw when adding a global with an invalid name', () => {
    const sandbox = new Sandbox(config);
    expect(() => sandbox.addGlobal('', 1)).toThrow('Global name must be a non-empty string');
    expect(() => sandbox.addGlobal(undefined, 1)).toThrow('Global name must be a non-empty string');
  });

  it('should throw when adding a global with an undefined value', () => {
    const sandbox = new Sandbox(config);
    expect(() => sandbox.addGlobal('newGlobal', undefined)).toThrow('Global value cannot be undefined');
  });

  it('should return the sandbox instance so addGlobal calls can be chained', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.addGlobal('one', 1).addGlobal('two', 2);
    expect(result).toBe(sandbox);
    expect(sandbox.eval('one + two')).toBe(3);
  });

  it('should eval some real business process examples', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.evalWithArgs(
      `(documents) => {
        const unit = documents
          ?.find((item => item?.documentTemplateId === 988071001))
          ?.data
          ?.calculated
          ?.moderatorUnitIds;
        return unit || []
      };`,
      [
        [
          {
            documentTemplateId: 988071001,
            data: {
              calculated: {
                moderatorUnitIds: [1, 2, 3],
              },
            },
          },
        ],
      ],
    );
    expect(result).toEqual([1, 2, 3]);
  });

  it('should throw an error if code is not a string', () => {
    const sandbox = new Sandbox(config);

    expect(() => sandbox.evalWithArgs(undefined, undefined, { throwOnUndefined: true })).toThrow('Sandbox error: "Code is undefined"');

    expect(() =>
      sandbox.evalWithArgs(undefined, undefined, {
        throwOnUndefined: true,
        meta: { fn: 'testFn' },
      }),
    ).toThrow('Sandbox error: "Code is undefined" in testFn');

    expect(() =>
      sandbox.evalWithArgs(undefined, undefined, {
        throwOnUndefined: true,
        meta: { fn: 'testFn', caller: 'testCaller' },
      }),
    ).toThrow('Sandbox error: "Code is undefined" in testFn called by testCaller');
  });

  it('should not work with a plain string without checkArrow', () => {
    const sandbox = new Sandbox(config);

    expect(() => sandbox.evalWithArgs('Витяг з Єдиного державного реєстру ветеранів війни', [])).toThrow('Sandbox error: "Unexpected token (1:6)"');
  });

  it('should work with a plain string with checkArrow', () => {
    const sandbox = new Sandbox(config);

    const result = sandbox.evalWithArgs('Витяг з Єдиного державного реєстру ветеранів війни', [], { checkArrow: true });

    expect(result).toBe('Витяг з Єдиного державного реєстру ветеранів війни');
  });

  it('should work with a quoted string', () => {
    const sandbox = new Sandbox(config);

    const result = sandbox.evalWithArgs('"Витяг з Єдиного державного реєстру ветеранів війни"', []);

    expect(result).toBe('Витяг з Єдиного державного реєстру ветеранів війни');
  });

  it('should handle syntax errors', () => {
    const sandbox = new Sandbox(config);

    expect(() => sandbox.evalWithArgs("(documents, events) => { return 'Тестовий юніт; }", [])).toThrow(
      'Sandbox error: "Unterminated string constant (1:32)"\n  (documents, events) => { return \'Тестовий юніт; }',
    );
  });

  it('should automatically add "async" to functions if isAsync is true', () => {
    const sandbox = new Sandbox(config);

    const result = sandbox.evalWithArgs('(a) => await test(a)', [42], { isAsync: true, global: { test: async (a) => a + 1 } });
    expect(result).toBeInstanceOf(Promise);

    return expect(result).resolves.toBe(43);
  });

  it('should correctly strip comments and trim code', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.evalWithArgs('\n/* comment */\n() => 1 + 1 // comment', [], { checkArrow: true });
    expect(result).toBe(2);
  });

  it('should handle faulty comments with eval', () => {
    const sandbox = new Sandbox(config);

    const fn = `() => false;
    // This is a faulty comment
    return true;`;

    const id = sandbox.eval(fn)();
    expect(id).toBe(false);
  });

  it('should handle faulty comments with evalWithArgs', () => {
    const sandbox = new Sandbox(config);

    const fn = `() => false;
    // This is a faulty comment
    return true;`;

    expect(() => sandbox.evalWithArgs(fn, [])).toThrow();
  });

  it('should evaluate an arrow function with an inline comment (workflow_template workaround)', () => {
    const sandbox = new Sandbox(config);

    let fn = `(user, unitIds, units) => user.id
      // inline comment';
      return false; }
    `;

    expect(() => sandbox.eval(fn)({ id: 123 }, [1], {})).toThrow();

    const idx = fn.indexOf('//');
    fn = fn.substring(0, idx).trim();
    const id = sandbox.eval(fn)({ id: 123 }, [1], {});
    expect(id).toBe(123);
  });

  describe('globals', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = new Sandbox(config);
    });

    it('should not contain symbol for "fs"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = fs; x }', [])).toThrow('fs is not defined');
    });

    it('should not contain symbol for "path"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = path; x }', [])).toThrow('path is not defined');
    });

    it('should not contain symbol for "os"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = os; x }', [])).toThrow('os is not defined');
    });

    it('should not contain symbol for "child_process"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = child_process; x }', [])).toThrow('child_process is not defined');
    });

    it('should not contain symbol for "cluster"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = cluster; x }', [])).toThrow('cluster is not defined');
    });

    it('should not contain symbol for "worker_threads"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = worker_threads; x }', [])).toThrow('worker_threads is not defined');
    });

    it('should not contain symbol for "http"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = http; x }', [])).toThrow('http is not defined');
    });

    it('should not contain symbol for "https"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = https; x }', [])).toThrow('https is not defined');
    });

    it('should not contain symbol for "net"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = net; x }', [])).toThrow('net is not defined');
    });

    it('should not contain symbol for "dgram"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = dgram; x }', [])).toThrow('dgram is not defined');
    });

    it('should not contain symbol for "dns"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = dns; x }', [])).toThrow('dns is not defined');
    });

    it('should not contain symbol for "__dirname"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = __dirname; x }', [])).toThrow('__dirname is not defined');
    });

    it('should not contain symbol for "__filename"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = __filename; x }', [])).toThrow('__filename is not defined');
    });

    it('should not contain symbol for "module"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = module; x }', [])).toThrow('module is not defined');
    });

    it('should not contain symbol for "exports"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = exports; x }', [])).toThrow('exports is not defined');
    });

    it('should not contain symbol for "require"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = require; x }', [])).toThrow('require is not defined');
    });

    it('should not contain symbol for "vm"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = vm; x }', [])).toThrow('vm is not defined');
    });

    it('should not contain symbol for "repl"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = repl; x }', [])).toThrow('repl is not defined');
    });

    it('should not contain symbol for "inspector"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = inspector; x }', [])).toThrow('inspector is not defined');
    });

    it('should not contain symbol for "async_hooks"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = async_hooks; x }', [])).toThrow('async_hooks is not defined');
    });

    it('should not contain symbol for "v8"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = v8; x }', [])).toThrow('v8 is not defined');
    });

    it('should not contain symbol for "tls"', () => {
      expect(() => sandbox.evalWithArgs('() => { const x = tls; x }', [])).toThrow('tls is not defined');
    });

    it('should not allow access to forbidden global "queueMicrotask"', () => {
      expect(sandbox.evalWithArgs('() => { return queueMicrotask }', [])).toBeUndefined();
    });

    it('should not allow access to forbidden global "navigator"', () => {
      expect(sandbox.evalWithArgs('() => { return navigator }', [])).toBeUndefined();
    });

    it('should not allow access to forbidden global "process"', () => {
      expect(sandbox.evalWithArgs('() => { return process }', [])).toBeUndefined();
    });

    it('should not allow access to forbidden global "globalThis"', () => {
      expect(sandbox.evalWithArgs('() => { return globalThis }', [])).toBeUndefined();
    });

    it('should not allow access to forbidden global "Function"', () => {
      expect(sandbox.evalWithArgs('() => { return Function }', [])).toBeUndefined();
    });

    it('should not allow access to forbidden global "Reflect"', () => {
      expect(sandbox.evalWithArgs('() => { return Reflect }', [])).toBeUndefined();
    });

    it('should not allow access to forbidden global "setInterval"', () => {
      expect(sandbox.evalWithArgs('() => { return setInterval }', [])).toBeUndefined();
    });

    it('should not allow access to forbidden global "setTimeout"', () => {
      expect(sandbox.evalWithArgs('() => { return setTimeout }', [])).toBeUndefined();
    });

    it('should not allow access to forbidden global "setImmediate"', () => {
      expect(sandbox.evalWithArgs('() => { return setImmediate }', [])).toBeUndefined();
    });

    it('should not allow access to forbidden global "clearInterval"', () => {
      expect(sandbox.evalWithArgs('() => { return clearInterval }', [])).toBeUndefined();
    });

    it('should not allow access to forbidden global "clearTimeout"', () => {
      expect(sandbox.evalWithArgs('() => { return clearTimeout }', [])).toBeUndefined();
    });

    it('should not allow access to forbidden global "clearImmediate"', () => {
      expect(sandbox.evalWithArgs('() => { return clearImmediate }', [])).toBeUndefined();
    });

    it('should not allow access to forbidden global "fetch"', () => {
      expect(sandbox.evalWithArgs('() => { return fetch }', [])).toBeUndefined();
    });

    it('should allow access to allowed global "Buffer"', () => {
      expect(() => sandbox.evalWithArgs('() => { return typeof Buffer }', [])).not.toThrow();
      expect(sandbox.evalWithArgs('() => { return typeof Buffer }', [])).not.toBe('undefined');
    });

    it('should allow access to allowed global "Proxy"', () => {
      expect(() => sandbox.evalWithArgs('() => { return typeof Proxy }', [])).not.toThrow();
      expect(sandbox.evalWithArgs('() => { return typeof Proxy }', [])).not.toBe('undefined');
    });

    it('should allow access to allowed global "crypto"', () => {
      expect(() => sandbox.evalWithArgs('() => { return typeof crypto }', [])).not.toThrow();
      expect(sandbox.evalWithArgs('() => { return typeof crypto }', [])).not.toBe('undefined');
    });

    it('should allow access to allowed global "Symbol"', () => {
      expect(() => sandbox.evalWithArgs('() => { return typeof Symbol }', [])).not.toThrow();
      expect(sandbox.evalWithArgs('() => { return typeof Symbol }', [])).not.toBe('undefined');
    });

    it('should allow access to allowed global "atob"', () => {
      expect(() => sandbox.evalWithArgs('() => { return typeof atob }', [])).not.toThrow();
      expect(sandbox.evalWithArgs('() => { return typeof atob }', [])).not.toBe('undefined');
    });

    it('should allow access to allowed global "btoa"', () => {
      expect(() => sandbox.evalWithArgs('() => { return typeof btoa }', [])).not.toThrow();
      expect(sandbox.evalWithArgs('() => { return typeof btoa }', [])).not.toBe('undefined');
    });

    it('should allow access to allowed global "structuredClone"', () => {
      expect(() => sandbox.evalWithArgs('() => { return typeof structuredClone }', [])).not.toThrow();
      expect(sandbox.evalWithArgs('() => { return typeof structuredClone }', [])).not.toBe('undefined');
    });

    it('should allow access to allowed global "log"', () => {
      expect(() => sandbox.evalWithArgs('() => { return typeof log }', [])).not.toThrow();
      expect(sandbox.evalWithArgs('() => { return typeof log }', [])).not.toBe('undefined');
    });

    it('should allow access to allowed global "console"', () => {
      expect(() => sandbox.evalWithArgs('() => { return typeof console }', [])).not.toThrow();
      expect(sandbox.evalWithArgs('() => { return typeof console }', [])).not.toBe('undefined');
    });

    it('should allow access to allowed global "_"', () => {
      // lodash
      expect(() => sandbox.evalWithArgs('() => { return typeof _ }', [])).not.toThrow();
      expect(sandbox.evalWithArgs('() => { return typeof _ }', [])).not.toBe('undefined');
    });

    it('should expose the randomUUID and getSha256Hash globals', () => {
      expect(sandbox.evalWithArgs('() => typeof randomUUID()', [])).toBe('string');
      expect(sandbox.evalWithArgs('() => getSha256Hash("test")', [])).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    });
  });

  describe('getInstance', () => {
    it('should throw if the sandbox was never constructed', () => {
      (Sandbox as any).singleton = undefined;
      expect(() => Sandbox.getInstance()).toThrow('Sandbox is not initialized.');
    });

    it('should return the last constructed sandbox', () => {
      const sandbox = new Sandbox(config);
      expect(Sandbox.getInstance()).toBe(sandbox);
    });
  });

  describe('globalFunctions', () => {
    let sandbox;

    it('should query for workflow templates', async () => {
      sandbox = new Sandbox(config);

      const models = {
        models: {
          workflowTemplate: {
            model: {
              findAll: jest.fn().mockResolvedValue([
                { id: 1, data: { globalFunctions: 'invalid' } },
                { id: 2, data: { globalFunctions: {} } },
                { id: 3, data: { globalFunctions: { testFunc: '(value) => `test-${value}`' } } },
              ]),
            },
          },
        },
      };

      await sandbox.init(models);

      expect(sandbox).toBeDefined();
      expect(log.save).toHaveBeenCalledWith(
        'sandbox-warning',
        expect.objectContaining({ workflowTemplateId: 1, message: expect.stringContaining('must be an object') }),
        'warn',
      );
      expect(log.save).toHaveBeenCalledWith('sandbox-global-function', { workflowTemplateId: 3, functionName: 'testFunc' }, 'info');
    });

    it('should use global functions from workflow templates', () => {
      const result = sandbox.evalWithArgs('() => $.workflow.testFunc("value")', [], { workflowTemplateId: 3 });
      expect(result).toBe('test-value');
    });

    it('should resolve the workflow template ID from trace meta when not passed in options', () => {
      let result;
      runInAsyncLocalStorage(() => {
        appendTraceMeta({ workflowTemplateId: 3 });
        result = sandbox.eval('() => $.workflow.testFunc("value")')();
      });
      expect(result).toBe('test-value');
    });

    it('should log and store a global function that fails to compile', () => {
      sandbox.updateWorkflowTemplateFunctions(4, { brokenFunc: '(value =>' });
      expect(() => sandbox.evalWithArgs('() => $.workflow.brokenFunc("value")', [], { workflowTemplateId: 4 })).toThrow(
        'Sandbox error: "$.workflow.brokenFunc is not a function"',
      );
      // `function` level compiles global functions on update, the isolate - on workflow template scope setup.
      expect(log.save).toHaveBeenCalledWith(
        'sandbox-global-function-error',
        expect.objectContaining({ workflowTemplateId: 4, functionName: 'brokenFunc' }),
        'warn',
      );
    });

    it('should ignore non-string and empty-string global function values', () => {
      sandbox.updateWorkflowTemplateFunctions(5, { a: 1, b: '', c: '(value) => value' });
      if (isFunctionLevel) {
        expect(sandbox.workflowTemplateFunctions[5]).toEqual({ c: expect.any(Function) });
      } else {
        // The isolate stores sources and compiles them inside each workflow template scope.
        expect(sandbox.workflowTemplateFunctionSources[5]).toEqual({ c: '(value) => value' });
      }
      expect(sandbox.evalWithArgs('(v) => $.workflow.c(v)', [7], { workflowTemplateId: 5 })).toBe(7);
    });

    it('should throw an error if global functions are not defined for the workflow template', () => {
      expect(() => sandbox.evalWithArgs('() => $.workflow.testFunc("value")', [], { workflowTemplateId: 1 })).toThrow(
        'Sandbox error: "$.workflow.testFunc is not a function"',
      );
    });

    it('should throw an error if a particular function is not defined in global functions', () => {
      expect(() => sandbox.evalWithArgs('() => $.workflow.nonExistentFunc("value")', [], { workflowTemplateId: 3 })).toThrow(
        'Sandbox error: "$.workflow.nonExistentFunc is not a function"',
      );
    });

    it('should warn and skip loading if models are not provided', async () => {
      const sandbox = new Sandbox(config);
      await expect(sandbox.init({})).resolves.toBeUndefined();
      expect(log.save).toHaveBeenCalledWith('sandbox-warning', { message: 'Models are required to initialize the sandbox.' }, 'warn');
    });
  });

  describe('minifyCode', () => {
    it('should strip single-line and multi-line comments and trim whitespace', () => {
      const code = `
        // leading comment
        /* block
           comment */
        const a = 1;
      `;
      expect(Sandbox.minifyCode(code)).toBe('const a = 1;');
    });

    it('should leave code without comments unchanged apart from trimming', () => {
      expect(Sandbox.minifyCode('  1 + 1  ')).toBe('1 + 1');
    });
  });

  describe('caching', () => {
    it('should reuse the compiled function for identical code and options', () => {
      const sandbox = new Sandbox(config);
      const first = sandbox.eval('() => Math.random()');
      const second = sandbox.eval('() => Math.random()');
      expect(second).toBe(first);
    });

    it('should compile separately when options differ', () => {
      const sandbox = new Sandbox(config);
      const first = sandbox.eval('() => 1', { checkArrow: true });
      const second = sandbox.eval('() => 1', { checkArrow: false });
      expect(second).not.toBe(first);
    });

    it('should respect a configured lru_max', () => {
      const sandbox = new Sandbox({ ...config, lru_max: 1 });
      sandbox.eval('1 + 1');
      sandbox.eval('2 + 2');
      expect(sandbox.cache.size).toBe(1);
    });
  });

  describe('eval / evalWithArgs edge cases', () => {
    it('should return the default value for non-string code', () => {
      const sandbox = new Sandbox(config);
      expect(sandbox.eval(null as any, { defaultValue: 'fallback' })).toBe('fallback');
      expect(sandbox.eval(42 as any, { defaultValue: 'fallback' })).toBe('fallback');
    });

    it('should return undefined from evalWithArgs when code is undefined and no fallback options are set', () => {
      const sandbox = new Sandbox(config);
      expect(sandbox.evalWithArgs(undefined, [])).toBeUndefined();
    });

    it('should return the defaultValue from evalWithArgs when code is undefined', () => {
      const sandbox = new Sandbox(config);
      expect(sandbox.evalWithArgs(undefined, [], { defaultValue: 'fallback' })).toBe('fallback');
    });

    it('should warn and return the raw value when the evaluated code is not a function', () => {
      const sandbox = new Sandbox(config);
      const result = sandbox.evalWithArgs('({ a: 1 })', []);
      expect(result).toEqual({ a: 1 });
      expect(log.save).toHaveBeenCalledWith('sandbox-warning', expect.objectContaining({ error: 'Function not found' }), 'warn');
    });

    it('should return the raw code and skip evaluation when checkArrow is set and the code is not an arrow function', () => {
      const sandbox = new Sandbox(config);
      const result = sandbox.evalWithArgs('({ a: 1 })', [], { checkArrow: true });
      expect(result).toBe('({ a: 1 })');
      expect(log.save).not.toHaveBeenCalledWith('sandbox-warning', expect.anything(), 'warn');
    });

    it('should slice extra arguments down to the arrow function arity', () => {
      const sandbox = new Sandbox(config);
      const result = sandbox.evalWithArgs('(a, b) => [a, b]', [1, 2, 3, 4]);
      expect(result).toEqual([1, 2]);
    });

    it('should log duration and call details when config.logging is enabled', () => {
      const sandbox = new Sandbox({ ...config, logging: true });
      const result = sandbox.evalWithArgs('(a, b) => a + b', [1, 2]);
      expect(result).toBe(3);
      expect(log.save).toHaveBeenCalledWith('sandbox-eval', expect.objectContaining({ isArrowFunction: true, arrowParams: ['a', 'b'] }));
    });

    it('should not log per-call details when config.logging is not enabled', () => {
      const sandbox = new Sandbox(config);
      sandbox.evalWithArgs('(a, b) => a + b', [1, 2]);
      expect(log.save).not.toHaveBeenCalledWith('sandbox-eval', expect.anything());
    });
  });

  describe('config options', () => {
    it('should use a custom globalFunctionsObject name', () => {
      const sandbox = new Sandbox({ ...config, globalFunctionsObject: 'helpers' });
      expect(sandbox.eval('typeof helpers.workflow')).toBe('object');
      expect(sandbox.eval('typeof $')).toBe('undefined');
    });

    it('should fall back to global.log when no getLog is configured', () => {
      const globalLog = { save: jest.fn() };
      (global as any).log = globalLog;
      try {
        const sandbox = new Sandbox({});
        sandbox.throwError(new Error('boom'), 'code', {});
        expect(globalLog.save).toHaveBeenCalledWith('sandbox-error', expect.objectContaining({ error: 'boom' }), 'error');
      } finally {
        delete (global as any).log;
      }
    });
  });

  // Regression coverage: a controlled low-code field (draftDeleteCondition, filter,
  // etc.) reached the real Function constructor and the host realm via the constructor/prototype
  // chain, which shadowed `undefined` globals did not stop. Access to constructor/prototype/__proto__
  // is now blocked at compile time, and dynamic property keys are guarded at runtime, while ordinary
  // dynamic indexing keeps working.
  describe('constructor / prototype escape hardening', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = new Sandbox(config);
    });

    it('should block the reported RCE payload reaching process via [].constructor.constructor', () => {
      expect(() => sandbox.evalWithArgs('(...a) => [].constructor.constructor("return process")()', [])).toThrow(
        'Sandbox error: "Access to "constructor" is blocked"',
      );
    });

    it('should block dot access to constructor', () => {
      expect(() => sandbox.eval('({}).constructor')).toThrow('Access to "constructor" is blocked');
    });

    it('should block computed string-literal access to constructor', () => {
      expect(() => sandbox.eval('({})["constructor"]')).toThrow('Access to "constructor" is blocked');
    });

    it('should block computed template-literal access to constructor', () => {
      expect(() => sandbox.eval('({})[`constructor`]')).toThrow('Access to "constructor" is blocked');
    });

    it('should block string-concatenation evasion for constructor', () => {
      expect(() => sandbox.eval('({})["con" + "structor"]')).toThrow('Access to "constructor" is blocked');
    });

    it('should block dot and computed access to prototype', () => {
      expect(() => sandbox.eval('Array.prototype')).toThrow('Access to "prototype" is blocked');
      expect(() => sandbox.eval('Array["prototype"]')).toThrow('Access to "prototype" is blocked');
    });

    it('should block dot and computed access to __proto__', () => {
      expect(() => sandbox.eval('({}).__proto__')).toThrow('Access to "__proto__" is blocked');
      expect(() => sandbox.eval('({})["__proto__"]')).toThrow('Access to "__proto__" is blocked');
    });

    it('should block the __proto__ setter shorthand in object literals', () => {
      expect(() => sandbox.eval('({ __proto__: [] })')).toThrow('Access to "__proto__" is blocked');
    });

    it('should block a dynamic key that resolves to constructor at runtime', () => {
      expect(() => sandbox.evalWithArgs('(k) => ({})[k]', ['constructor'])).toThrow('Sandbox error: "Access to "constructor" is blocked"');
    });

    // Host objects only: arguments are copied into the isolate as data, without `toString`.
    (isFunctionLevel ? it : it.skip)('should block a toString-coerced key evasion (TOCTOU-safe)', () => {
      const evil = { toString: () => 'constructor' };
      expect(() => sandbox.evalWithArgs('(o) => ({})[o]', [evil])).toThrow('Sandbox error: "Access to "constructor" is blocked"');
    });

    it('should reject low-code that references the reserved key-guard identifier', () => {
      expect(() => sandbox.eval('(__sbKey) => __sbKey')).toThrow('reserved');
      expect(() => sandbox.eval('() => { var __sbKey = 1; return __sbKey; }')).toThrow('reserved');
    });

    it('should still allow dynamic array and object indexing', () => {
      expect(sandbox.evalWithArgs('(arr, i) => arr[i]', [[10, 20, 30], 2])).toBe(30);
      expect(sandbox.evalWithArgs('(obj, k) => obj[k]', [{ name: 'liquio' }, 'name'])).toBe('liquio');
    });

    it('should still allow numeric-literal indexing', () => {
      expect(sandbox.eval('[9, 8, 7][0]')).toBe(9);
    });

    it('should preserve `this` binding for a method called via a dynamic key', () => {
      expect(sandbox.evalWithArgs('(s, m) => s[m]()', ['AB', 'toLowerCase'])).toBe('ab');
    });

    it('should allow assignment through a dynamic key', () => {
      expect(sandbox.evalWithArgs('(o, k) => { o[k] = 5; return o.a; }', [{}, 'a'])).toBe(5);
    });

    it('should allow symbol keys such as Symbol.iterator', () => {
      expect(sandbox.evalWithArgs('(arr) => (typeof arr[Symbol.iterator] === "function")', [[1, 2]])).toBe(true);
    });

    it('should allow nested dynamic keys', () => {
      expect(sandbox.evalWithArgs('(o, a, b) => o[a][b]', [{ x: { y: 42 } }, 'x', 'y'])).toBe(42);
    });

    it('should block reaching the constructor through a with block', () => {
      expect(() => sandbox.evalWithArgs('() => { with ([]) { with (constructor) { return constructor("return typeof process")(); } } }', [])).toThrow(
        'Sandbox error: ""with" statements are not allowed"',
      );
    });

    it('should alert when a with block is used', () => {
      expect(() => sandbox.eval('() => { with ({ a: 1 }) { return a; } }')).toThrow('"with" statements are not allowed');
      expect(log.save).toHaveBeenCalledWith('sandbox-alert', expect.objectContaining({ message: 'Access to with statement detected' }), 'warn');
    });

    it('should still allow "with" in strings and identifiers', () => {
      expect(sandbox.evalWithArgs('(withdraw) => "paid with card: " + withdraw', [5])).toBe('paid with card: 5');
    });
  });

  // The guarded lodash wrapper (`lodash.ts`) checks the path argument of every path-resolving helper
  // and blocks `_.template`, closing the runtime string-path route to `constructor`/`prototype`.
  describeFunctionLevel('lodash path hardening', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = new Sandbox(config);
    });

    it('should block lodash _.template, which compiles code with the real Function', () => {
      expect(() => sandbox.evalWithArgs('() => _.template("<%= typeof process %>")()', [])).toThrow('Access to lodash.template is blocked');
      expect(() => sandbox.evalWithArgs('() => _.template("<% __p += typeof process %>")()', [])).toThrow('Access to lodash.template is blocked');
    });

    it('should block a forbidden segment in a string path (_.get, _.result, _.has, _.invoke)', () => {
      expect(() => sandbox.evalWithArgs('() => _.get([], "constructor.constructor")', [])).toThrow('Access to "constructor" is blocked');
      expect(() => sandbox.evalWithArgs('() => _.result({ a: [] }, "a.constructor.constructor")', [])).toThrow('Access to "constructor" is blocked');
      expect(() => sandbox.evalWithArgs('() => _.has([], "a.prototype")', [])).toThrow('Access to "prototype" is blocked');
      expect(() => sandbox.evalWithArgs('() => _.invoke({ a: [] }, "a.constructor.constructor")', [])).toThrow('Access to "constructor" is blocked');
    });

    it('should block a forbidden segment in an array path', () => {
      expect(() => sandbox.evalWithArgs('() => _.invoke({ a: [] }, ["a", "constructor", "constructor"])', [])).toThrow(
        'Access to "constructor" is blocked',
      );
      expect(() => sandbox.evalWithArgs('() => _.get({}, ["__proto__", "polluted"])', [])).toThrow('Access to "__proto__" is blocked');
    });

    it('should block the path-to-function helpers (_.property, _.method, _.iteratee, _.matchesProperty)', () => {
      expect(() => sandbox.evalWithArgs('() => _.property("constructor.constructor")([])', [])).toThrow('Access to "constructor" is blocked');
      expect(() => sandbox.evalWithArgs('() => _.method("constructor.constructor")([])', [])).toThrow('Access to "constructor" is blocked');
      expect(() => sandbox.evalWithArgs('() => _.iteratee("constructor.constructor")([])', [])).toThrow('Access to "constructor" is blocked');
      expect(() => sandbox.evalWithArgs('() => _.matchesProperty("constructor.constructor", 1)', [])).toThrow('Access to "constructor" is blocked');
    });

    it('should block the object-bound resolvers (_.propertyOf, _.methodOf)', () => {
      expect(() => sandbox.evalWithArgs('() => _.propertyOf([])("constructor.constructor")', [])).toThrow('Access to "constructor" is blocked');
      expect(() => sandbox.evalWithArgs('() => _.methodOf([])("constructor.constructor")', [])).toThrow('Access to "constructor" is blocked');
    });

    it('should block the multi-path helpers (_.at, _.invokeMap)', () => {
      expect(() => sandbox.evalWithArgs('() => _.at([], ["constructor.constructor"])[0]', [])).toThrow('Access to "constructor" is blocked');
      expect(() => sandbox.evalWithArgs('() => _.invokeMap([[]], "constructor.constructor")', [])).toThrow('Access to "constructor" is blocked');
    });

    it('should block the mutating path helpers (_.set, _.update, _.unset)', () => {
      expect(() => sandbox.evalWithArgs('() => _.set({}, "constructor.prototype.x", 1)', [])).toThrow('Access to "constructor" is blocked');
      expect(() => sandbox.evalWithArgs('() => _.update({}, "__proto__.x", () => 1)', [])).toThrow('Access to "__proto__" is blocked');
      expect(() => sandbox.evalWithArgs('() => _.unset({}, "a.prototype")', [])).toThrow('Access to "prototype" is blocked');
    });

    it('should still resolve safe string and array paths', () => {
      expect(sandbox.evalWithArgs('() => _.get({ a: { b: 2 } }, "a.b")', [])).toBe(2);
      expect(sandbox.evalWithArgs('() => _.get({ a: { b: 2 } }, ["a", "b"])', [])).toBe(2);
      expect(sandbox.evalWithArgs('() => _.property("a.b")({ a: { b: 5 } })', [])).toBe(5);
      expect(sandbox.evalWithArgs('() => _.at({ a: 1, b: 2 }, ["a", "b"])', [])).toEqual([1, 2]);
    });

    it('should still support safe _.set and lodash chaining', () => {
      expect(sandbox.evalWithArgs('() => _.set({}, "a.b", 7).a.b', [])).toBe(7);
      expect(sandbox.evalWithArgs('() => _([1, 2, 3]).map((n) => n * 2).value()', [])).toEqual([2, 4, 6]);
    });
  });

  // The guarded `Object` wrapper (`object.ts`) blocks the reflection methods that reach the
  // constructor/prototype chain via a string argument, while keeping the rest of `Object` usable.
  describeFunctionLevel('Object reflection hardening', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = new Sandbox(config);
    });

    it('should block Object.getOwnPropertyDescriptor', () => {
      expect(() => sandbox.evalWithArgs('() => Object.getOwnPropertyDescriptor([], "length")', [])).toThrow(
        'Access to Object.getOwnPropertyDescriptor is blocked',
      );
    });

    it('should block Object.getPrototypeOf', () => {
      expect(() => sandbox.evalWithArgs('() => Object.getPrototypeOf([])', [])).toThrow('Access to Object.getPrototypeOf is blocked');
    });

    it('should block the descriptor route to the constructor', () => {
      expect(() => sandbox.evalWithArgs('() => Object.getOwnPropertyDescriptor(Object.getPrototypeOf([]), "constructor").value', [])).toThrow(
        'Access to Object.getPrototypeOf is blocked',
      );
    });

    it('should still allow the safe Object statics', () => {
      expect(sandbox.evalWithArgs('() => Object.keys({ a: 1, b: 2 })', [])).toEqual(['a', 'b']);
      expect(sandbox.evalWithArgs('() => Object.values({ a: 1, b: 2 })', [])).toEqual([1, 2]);
      expect(sandbox.evalWithArgs('() => Object.entries({ a: 1 })', [])).toEqual([['a', 1]]);
      expect(sandbox.evalWithArgs('() => Object.assign({}, { a: 1 }, { b: 2 })', [])).toEqual({ a: 1, b: 2 });
      expect(sandbox.evalWithArgs('() => Object.freeze({ a: 1 }).a', [])).toBe(1);
      expect(sandbox.evalWithArgs('() => Object({ a: 1 }).a', [])).toBe(1);
    });
  });

  // Indirect `eval` runs in the host global realm, where the shadowed `process`/`global`/`Function` locals do not
  // apply, and `import()` is a keyword that can't be shadowed at all. Both bypass the constructor/prototype guard on
  // the `function` level, so the AST guard must reject them on both levels.
  describe('eval / dynamic import() escape hardening', () => {
    let sandbox;
    const run = async (code) => sandbox.evalWithArgs(code, [], { isAsync: true });

    beforeEach(() => {
      sandbox = new Sandbox(config);
    });

    it.each([
      ['indirect eval', '() => (0,eval)("typeof process")'],
      ['aliased eval', '() => { const e = eval; return e("typeof process") }'],
      ['eval through an array', '() => [eval][0]("typeof process")'],
      ['direct eval', '() => eval("typeof process")'],
      ['indirect eval nested in direct eval', '() => eval("(0,eval)(\'typeof process\')")'],
      ['host Function via indirect eval', '() => (0,eval)("this.Function")("return typeof process")()'],
    ])('should block %s', async (_name, code) => {
      await expect(run(code)).rejects.toThrow('Access to "eval" is blocked');
    });

    it.each([
      ['a string specifier', '() => import("fs").then((m) => typeof m.readFileSync)'],
      ['a template specifier', '() => import(`child_process`).then((m) => typeof m.execSync)'],
      ['a computed specifier', '() => { const n = "f" + "s"; return import(n).then((m) => typeof m.readFileSync) }'],
    ])('should block dynamic import() with %s', async (_name, code) => {
      await expect(run(code)).rejects.toThrow('Access to "import()" is blocked');
    });

    // A sloppy-mode function called without a receiver gets the global object as `this`: on the `function` level that
    // is the host global object (and its `process`, `eval`, `Function`), with no `eval`/`import` in the code at all.
    it.each([
      ['global object from sloppy-mode this', '() => typeof (function () { return this; })().process'],
      ['eval from the global object', '() => (function () { return this; })()["ev" + "al"]("typeof process")'],
      ['Function from the global object', '() => (function () { return this; })()["Func" + "tion"]("return typeof process")()'],
    ])('should not reach host process via %s', async (_name, code) => {
      const result = await run(code).catch(() => 'blocked');
      expect(['undefined', 'blocked']).toContain(result);
    });

    it('should not leak host config, env or files through eval or import()', async () => {
      (global as any).config = { canary: 'CANARY-CONFIG-SECRET' };
      try {
        const payloads = [
          '() => (0,eval)("JSON.stringify(global.config)")',
          '() => (0,eval)("process.env.USER || process.env.USERNAME")',
          "() => (0,eval)(\"process.getBuiltinModule('fs').readFileSync('./package.json').toString()\")",
          '() => import("fs").then((m) => m.readFileSync("./package.json", "utf8"))',
        ];
        for (const code of payloads) {
          const result = await run(code).catch((error) => error);
          expect(result).toBeInstanceOf(Error);
          expect(String(result.message)).not.toContain('CANARY-CONFIG-SECRET');
        }
      } finally {
        delete (global as any).config;
      }
    });

    it('should log a sandbox-alert when eval or import() is detected', async () => {
      await run('() => (0,eval)("1")').catch(() => {});
      await run('() => import("fs")').catch(() => {});
      expect(log.save).toHaveBeenCalledWith('sandbox-alert', expect.objectContaining({ message: 'Access to eval detected' }), 'warn');
      expect(log.save).toHaveBeenCalledWith('sandbox-alert', expect.objectContaining({ message: 'Access to import() detected' }), 'warn');
    });

    it('should still allow "eval" and "import" as property names and inside strings', () => {
      expect(sandbox.evalWithArgs('() => ({ eval: 1, import: 2 }).eval', [])).toBe(1);
      expect(sandbox.evalWithArgs('(o) => o.import + o.evaluate', [{ import: 2, evaluate: 3 }])).toBe(5);
      expect(sandbox.evalWithArgs('() => "eval(1); import(\'fs\')"', [])).toBe("eval(1); import('fs')");
    });
  });

  // The AST guard used to parse ES2020 only and compile anything it couldn't parse unguarded (after a word check), so
  // newer syntax in `sandbox.eval` code switched off the guard, including the runtime key guard.
  describe('guard on newer syntax (sandbox.eval)', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = new Sandbox(config);
    });

    it.each([
      ['logical assignment (ES2021)', '(() => { let a; a ??= 1; const c = "con" + "structor"; return [][c][c]("return typeof process")(); })()'],
      ['class field (ES2022)', '(() => { class A { x = 1 } const c = "con" + "structor"; return [][c][c]("return typeof process")(); })()'],
      ['static block (ES2022)', '(() => { class A { static { this.c = "con" + "structor"; } } return [][A.c][A.c]("return typeof process")(); })()'],
    ])('should apply the guard to code with %s', (_name, code) => {
      expect(() => sandbox.eval(code)).toThrow('Access to "constructor" is blocked');
    });

    it('should apply the runtime key guard to code with newer syntax', () => {
      expect(() => sandbox.eval('(k) => { let a; a ??= 1; return ({})[k]; }')('constructor')).toThrow('Access to "constructor" is blocked');
    });

    it('should apply eval/import() rules to code with newer syntax', () => {
      expect(() => sandbox.eval('(() => { let a; a ||= 1; return (0,eval)("typeof process"); })()')).toThrow('Access to "eval" is blocked');
      expect(() => sandbox.eval('(() => { let a; a &&= 1; return import("fs"); })()')).toThrow('Access to "import()" is blocked');
    });

    it('should still run legitimate code with newer syntax', () => {
      expect(sandbox.eval('(() => { let a = null; a ??= 5; return a; })()')).toBe(5);
      expect(sandbox.eval('(() => { class A { x = 2; static y = 3; } return new A().x + A.y; })()')).toBe(5);
      expect(sandbox.eval('1_000 + 1')).toBe(1001);
    });

    it('should guard object literal expressions, which are only valid after `return`', () => {
      expect(sandbox.eval('{ a: 1, b: [2, 3] }')).toEqual({ a: 1, b: [2, 3] });
      expect(sandbox.eval('{ a: [10, 20][i] }', { global: { i: 1 } })).toEqual({ a: 20 });
      expect(() => sandbox.eval('{ a: ({})[k], b: 1 }', { global: { k: 'constructor' } })).toThrow('Access to "constructor" is blocked');
      expect(() => sandbox.eval('{ a: [].constructor, b: 1 }')).toThrow('Access to "constructor" is blocked');
    });

    it('should reject code that cannot be parsed instead of compiling it unguarded', () => {
      expect(() => sandbox.eval('(() => { return [].con\\u{73}tructor; ')).toThrow();
      expect(() => sandbox.eval('Витяг з реєстру')).toThrow();
    });
  });

  // Low-code must not change the host process: install hooks into shared built-ins, overwrite shared helpers, see data
  // of another workflow template, or exhaust CPU/memory of the service. Each check passes if the code is blocked or
  // has no effect outside of its own call.
  describe('host integrity and availability', () => {
    let sandbox;
    const runSafe = async (code, options = {}) => {
      try {
        return await sandbox.evalWithArgs(code, [], { isAsync: true, ...options });
      } catch {
        return 'blocked';
      }
    };

    beforeEach(() => {
      sandbox = new Sandbox(config);
    });

    describe('stack trace API', () => {
      // Node 22 has a default `Error.prepareStackTrace`; jest's environment has none.
      const hostPrepareStackTrace = Error.prepareStackTrace;
      const hostStackTraceLimit = Error.stackTraceLimit;

      afterEach(() => {
        Error.prepareStackTrace = hostPrepareStackTrace;
        Error.stackTraceLimit = hostStackTraceLimit;
      });

      it('should not reach the host global object through stack trace callsites', async () => {
        const result = await runSafe(
          '() => { Error.prepareStackTrace = (e, st) => st[0].getThis(); const g = new Error().stack; return typeof (g && g.process); }',
        );
        expect(['undefined', 'blocked']).toContain(result);
      });

      it.each([
        ['assignment', '() => { Error.prepareStackTrace = () => "pwned"; }'],
        ['computed assignment', '() => { Error["prepare" + "StackTrace"] = () => "pwned"; }'],
        ['Object.assign', '() => { Object.assign(Error, { prepareStackTrace: () => "pwned" }); }'],
        ['Object.defineProperty', '() => { Object.defineProperty(Error, "prepareStackTrace", { value: () => "pwned", configurable: true }); }'],
      ])('should not install a host stack trace hook via %s', async (_name, code) => {
        await runSafe(code);
        expect(Error.prepareStackTrace).toBe(hostPrepareStackTrace);
        expect(new Error('probe').stack).toMatch(/^Error: probe/);
      });

      it('should not change the host Error.stackTraceLimit', async () => {
        await runSafe('() => { Error.stackTraceLimit = 0; }');
        expect(Error.stackTraceLimit).toBe(hostStackTraceLimit);
      });
    });

    describe('shared built-ins and helpers', () => {
      const originals = {
        jsonParse: JSON.parse,
        jsonStringify: JSON.stringify,
        mathRandom: Math.random,
        dateNow: Date.now,
        arrayIsArray: Array.isArray,
        momentFormat: hostMoment.fn.format,
      };

      afterEach(() => {
        JSON.parse = originals.jsonParse;
        JSON.stringify = originals.jsonStringify;
        Math.random = originals.mathRandom;
        Date.now = originals.dateNow;
        Array.isArray = originals.arrayIsArray;
        hostMoment.fn.format = originals.momentFormat;
      });

      it.each([
        ['JSON.parse', '() => { JSON.parse = () => "pwned"; }', () => JSON.parse('1') === 1],
        ['JSON.stringify via Object.assign', '() => { Object.assign(JSON, { stringify: () => "pwned" }); }', () => JSON.stringify(1) === '1'],
        ['Math.random', '() => { Math.random = () => 4; }', () => Math.random() < 1],
        ['Date.now', '() => { Date.now = () => 0; }', () => Date.now() > 0],
        ['Array.isArray', '() => { Array.isArray = () => false; }', () => Array.isArray([])],
        ['moment.fn.format', '() => { moment.fn.format = () => "pwned"; }', () => hostMoment('2026-10-11').format('YYYY') === '2026'],
      ])('should not overwrite host %s', async (_name, code, isIntact) => {
        await runSafe(code);
        expect(isIntact()).toBe(true);
      });

      it('should not let one call overwrite lodash for other sandboxes', async () => {
        await runSafe('() => { _.get = () => "pwned"; }');
        await runSafe('() => { _.mixin({ map: () => "pwned" }); }');
        expect(new Sandbox(config).evalWithArgs('() => [_.get({ a: 1 }, "a"), _.map([1], (x) => x + 1)]', [])).toEqual([1, [2]]);
      });

      // [name, code, host value reader, host value restorer]
      it.each([
        [
          'Promise.resolve',
          '() => { Promise.resolve = () => "pwned"; }',
          () => Promise.resolve,
          (v) => {
            Promise.resolve = v;
          },
        ],
        [
          'String.raw',
          '() => { String.raw = () => "pwned"; }',
          () => String.raw,
          (v) => {
            String.raw = v;
          },
        ],
        [
          'Number.isFinite',
          '() => { Number.isFinite = () => "pwned"; }',
          () => Number.isFinite,
          (v) => {
            Number.isFinite = v;
          },
        ],
        [
          'Buffer.from',
          '() => { Buffer.from = () => "pwned"; }',
          () => Buffer.from,
          (v) => {
            Buffer.from = v;
          },
        ],
        [
          'Intl.DateTimeFormat',
          '() => { Intl.DateTimeFormat = () => "pwned"; }',
          () => Intl.DateTimeFormat,
          (v) => {
            Intl.DateTimeFormat = v;
          },
        ],
        [
          'Symbol.for',
          '() => { Symbol.for = () => "pwned"; }',
          () => Symbol.for,
          (v) => {
            Symbol.for = v;
          },
        ],
        [
          'Object.keys',
          '() => { Object.keys = () => "pwned"; }',
          () => Object.keys,
          (v) => {
            Object.keys = v;
          },
        ],
        [
          'iconv.decode',
          '() => { iconv.decode = () => "pwned"; }',
          () => hostIconv.decode,
          (v) => {
            hostIconv.decode = v;
          },
        ],
        [
          'default helper properties',
          '() => { getMd5Hash.pwned = true; }',
          () => sandbox.defaultGlobals.getMd5Hash.pwned,
          () => {
            delete sandbox.defaultGlobals.getMd5Hash.pwned;
          },
        ],
      ])('should not change host %s', async (_name, code, read, restore) => {
        const before = read();
        try {
          await runSafe(code);
          expect(read()).toBe(before);
        } finally {
          restore(before);
        }
      });

      it('should not change host global bindings by assignment', async () => {
        const hostParseInt = parseInt;
        try {
          expect(await runSafe('() => { parseInt = () => 0; return parseInt("5"); }')).toBe(0);
          expect(parseInt).toBe(hostParseInt);
        } finally {
          (global as any).parseInt = hostParseInt;
        }
      });

      // In a child process, see `runInChildProcess`.
      it('should not create host globals by assignment to an undeclared name', () => {
        const child = runInChildProcess(`
          const sandbox = new Sandbox({ isolationLevel: ${JSON.stringify(isolationLevel)} });
          try {
            sandbox.evalWithArgs('() => { leakedSandboxGlobal = 1; }', []);
          } catch {}
          console.log('LEAKED ' + typeof leakedSandboxGlobal);
        `);
        expect(child.stdout).toMatch(/^LEAKED undefined$/m);
      });

      it.each(['require', 'module', 'process', '__dirname'])('should not expose host %s', async (name) => {
        expect(await runSafe(`() => typeof ${name}`)).toBe('undefined');
      });
    });

    // Read-only views are the `function` level only: the isolate has its own built-ins and copies data across.
    describeFunctionLevel('read-only views of built-ins and helpers', () => {
      it('should keep built-ins and helpers working through read-only views', async () => {
        const result = await sandbox.evalWithArgs(
          `async (hostError, hostDate, hostArray) => {
          class MyError extends Error {}
          let caught;
          try { null.x; } catch (e) { caught = e; }
          return [
            caught instanceof TypeError, caught instanceof Error, new MyError("m") instanceof Error, hostError instanceof Error,
            hostDate instanceof Date, new Date(0).toISOString(), typeof Date.now(),
            hostArray instanceof Array, Array.isArray(hostArray), Array.from("ab"), Array.of(1, 2),
            await Promise.resolve(1), (await Promise.all([1, Promise.resolve(2)])).join(),
            JSON.parse(JSON.stringify({ a: [1] })).a[0], Math.max(1, 3),
            Buffer.from("aGk=", "base64").toString(),
            new TextEncoder().encode("ї").length, new Intl.NumberFormat("en-US").format(1234.5), structuredClone({ a: 1 }).a,
            Object.keys({ a: 1, b: 2 }).join(), Object.entries({ a: 1 })[0][0], new Map([[1, 2]]).get(1), [...new Set([1, 1, 2])].length,
            moment("2026-10-11").add(1, "day").format("DD.MM.YYYY"), moment.isMoment(moment()), moment("2026-10-11").locale("uk").format("MMMM"),
            _.get({ a: { b: 5 } }, "a.b"), _.chain([3, 1, 2]).sortBy().value().join(), getMd5Hash("test"),
          ];
        }`,
          [new Error('host'), new Date(0), [1]],
          { isAsync: true },
        );
        expect(result).toEqual([
          true,
          true,
          true,
          true,
          true,
          '1970-01-01T00:00:00.000Z',
          'number',
          true,
          true,
          ['a', 'b'],
          [1, 2],
          1,
          '1,2',
          1,
          3,
          'hi',
          2,
          '1,234.5',
          1,
          'a,b',
          'a',
          2,
          2,
          '12.10.2026',
          true,
          'жовтень',
          5,
          '1,2,3',
          '098f6bcd4621d373cade4e832627b4f6',
        ]);
      });

      it('should return real host objects, not read-only views', () => {
        const result = sandbox.evalWithArgs('() => ({ d: new Date(0), m: moment(0), list: Array.from([1]), error: new Error("x") })', []);
        expect(result.d).toBeInstanceOf(Date);
        expect(hostMoment.isMoment(result.m)).toBe(true);
        expect(Array.isArray(result.list)).toBe(true);
        expect(result.error).toBeInstanceOf(Error);
        result.list.push(2);
        expect(result.list).toEqual([1, 2]);
      });
    });

    it('should not share the default global object between workflow templates', async () => {
      await runSafe('() => { global.leak = "template 1 data"; }', { workflowTemplateId: 101 });
      expect(await runSafe('() => global.leak', { workflowTemplateId: 102 })).toBeUndefined();
    });

    it('should keep the default global object within a workflow template, also for the same cached code', async () => {
      const counter = '() => { global.counter = (global.counter || 0) + 1; return global.counter; }';
      expect(await runSafe(counter, { workflowTemplateId: 103 })).toBe(1);
      expect(await runSafe(counter, { workflowTemplateId: 103 })).toBe(2);
      expect(await runSafe(counter, { workflowTemplateId: 104 })).toBe(1);
    });

    it('should bind cached code to the workflow template from trace meta', async () => {
      const read = () => sandbox.evalWithArgs('() => global.owner', []);
      await runInAsyncLocalStorage(() => {
        appendTraceMeta({ workflowTemplateId: 105 });
        sandbox.evalWithArgs('() => { global.owner = "template 105"; }', []);
        expect(read()).toBe('template 105');
      });
      await runInAsyncLocalStorage(() => {
        appendTraceMeta({ workflowTemplateId: 106 });
        expect(read()).toBeUndefined();
      });
    });

    // Known gap of the `function` level: results are passed by reference, so a getter in a result runs later in host
    // code. It still runs guarded sandbox code. The isolate copies results.
    (isFunctionLevel ? it.failing : it)('should not return live objects with getters to the host', () => {
      const result = sandbox.evalWithArgs('() => ({ get name() { return "computed"; } })', []);
      expect(Object.getOwnPropertyDescriptor(result, 'name')?.get).toBeUndefined();
    });

    describe('CPU limits', () => {
      // Each payload stops by itself after ~2 s, so a level without a timeout fails the check instead of hanging. Known gap
      // of the `function` level, marked `failing`: code runs on the service thread, which nothing can interrupt.
      (isFunctionLevel ? it.failing : it).each([
        ['a busy loop', '() => { const t = Date.now(); while (Date.now() - t < 2000); return "finished"; }'],
        ['catastrophic regex backtracking', '() => /^(a+)+$/.test("a".repeat(25) + "!")'],
        ['an await loop', 'async () => { const t = Date.now(); while (Date.now() - t < 2000) await null; return "finished"; }'],
      ])(
        'should stop %s by timeout',
        async (_name, code) => {
          await expect(Promise.resolve().then(() => sandbox.evalWithArgs(code, [], { isAsync: true }))).rejects.toThrow(/timed out/);
        },
        20000,
      );
    });

    // In a child process, see `runInChildProcess`. Known gap of the `function` level, marked `failing` until fixed: it
    // has no memory limit (allocates on the host heap). The `isolated-vm` level fails with the isolate memory limit error.
    (isFunctionLevel ? it.failing : it)(
      'should stop a memory bomb with an error, without crashing the host process',
      () => {
        const child = runInChildProcess(`
          const sandbox = new Sandbox({ isolationLevel: ${JSON.stringify(isolationLevel)} });
          try {
            const length = sandbox.evalWithArgs('() => new Array(4e7).fill(1.5).length', []);
            console.log('RETURNED ' + length);
          } catch (error) {
            console.log('THREW ' + error.message);
          }
        `);
        expect({ status: child.status, signal: child.signal }).toEqual({ status: 0, signal: null });
        expect(child.stdout).toMatch(/^THREW /m);
      },
      70000,
    );
  });

  // Destructuring reads a property by name without a member expression, so the AST guard rejects
  // forbidden keys in object patterns.
  describe('destructuring hardening', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = new Sandbox(config);
    });

    it('should block destructuring constructor off a built-in', () => {
      expect(() =>
        sandbox.evalWithArgs('() => { const { constructor: C } = []; const { constructor: F } = C; return F("return typeof process")(); }', []),
      ).toThrow('Access to "constructor" is blocked');
    });

    it('should block destructuring prototype', () => {
      expect(() => sandbox.evalWithArgs('(fn) => { const { prototype } = fn; return prototype; }', [() => 1])).toThrow(
        'Access to "prototype" is blocked',
      );
    });

    it('should block destructuring __proto__', () => {
      expect(() => sandbox.evalWithArgs('(o) => { const { __proto__: p } = o; return p; }', [{}])).toThrow('Access to "__proto__" is blocked');
    });

    it('should block shorthand and computed-literal forbidden keys in patterns', () => {
      expect(() => sandbox.evalWithArgs('() => { const { constructor } = []; return constructor; }', [])).toThrow(
        'Access to "constructor" is blocked',
      );
      expect(() => sandbox.evalWithArgs('() => { const { ["constructor"]: C } = []; return C; }', [])).toThrow('Access to "constructor" is blocked');
    });

    it('should still allow destructuring ordinary keys', () => {
      expect(sandbox.evalWithArgs('(o) => { const { a, b } = o; return a + b; }', [{ a: 2, b: 3 }])).toBe(5);
      expect(sandbox.evalWithArgs('(o) => { const { a: x = 9 } = o; return x; }', [{}])).toBe(9);
    });
  });
});

describe('Sandbox config defaults', () => {
  const getLog = () => log;

  it.each([
    ['no config', undefined],
    ['no isolationLevel', { getLog }],
    ['isolationLevel "isolated-vm"', { getLog, isolationLevel: SandboxIsolationLevel.IsolatedVm }],
    ['an unknown isolationLevel', { getLog, isolationLevel: 'isolated_vm' as SandboxIsolationLevel }],
  ])('should use the isolated-vm level with %s', (_name, config) => {
    const sandbox = new Sandbox(config);
    expect(sandbox.isIsolated).toBe(true);
    expect(sandbox.evalWithArgs('() => typeof (function () { return this; })().process', [])).toBe('undefined');
  });

  it('should use the function level only when configured explicitly', () => {
    expect(new Sandbox({ getLog, isolationLevel: SandboxIsolationLevel.Function }).isIsolated).toBe(false);
  });

  describe('strictMode (function level)', () => {
    const config = { getLog, isolationLevel: SandboxIsolationLevel.Function };

    afterEach(() => {
      delete (global as any).sloppyModeProbe;
    });

    it('should compile in strict mode by default', () => {
      const sandbox = new Sandbox(config);
      expect(sandbox.strictMode).toBe(true);
      expect(sandbox.evalWithArgs('() => typeof (function () { return this; })()', [])).toBe('undefined');
      // In a child process, see `runInChildProcess`.
      const child = runInChildProcess(`
        const sandbox = new Sandbox({ isolationLevel: 'function' });
        try {
          sandbox.evalWithArgs('() => { sloppyModeProbe = 1; }', []);
          console.log('RETURNED');
        } catch (error) {
          console.log('THREW ' + error.message);
        }
      `);
      expect(child.stdout).toMatch(/^THREW .*sloppyModeProbe is not defined/m);
    });

    it('should compile in sloppy mode when strictMode is false', () => {
      const sandbox = new Sandbox({ ...config, strictMode: false });
      expect(sandbox.strictMode).toBe(false);
      expect(sandbox.evalWithArgs('() => typeof (function () { return this; })()', [])).toBe('object');
      expect(sandbox.evalWithArgs('(n) => { const octal = 010; return octal + n; }', [1])).toBe(9);
    });
  });
});
