import { Sandbox, SandboxIsolationLevel } from './sandbox';
import { appendTraceMeta, runInAsyncLocalStorage } from './async_local_storage';

const log = { save: jest.fn() };

describe('Sandbox', () => {
  const config = { getLog: () => log };

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

  it('should check for arrow functions and return raw string if not', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.evalWithArgs('1 + 1', [], { checkArrow: true });
    expect(result).toBe('1 + 1');
  });

  it('should check for arrow functions and return evaluated code if found', () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.eval(' (a, b) => a + b', { checkArrow: true });
    expect(result).toBeInstanceOf(Function);
    expect((result as any)(1, 2)).toBe(3);
  });

  it('should transform functions to async', async () => {
    const sandbox = new Sandbox(config);
    const result = sandbox.evalWithArgs('(a) => test(a)', [42], {
      isAsync: true,
      global: { test: async (a: number) => a + 1 },
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

    // Warning: Predefined globals are not protected.
    sandbox.eval('fetch = function() { return "fetch" }');
    expect((fetch as any)()).toBe('fetch');
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
    sandbox.addGlobal('double', (n: number) => n * 2);
    expect(sandbox.eval('double(21)')).toBe(42);
  });

  it('should throw when adding a global that already exists', () => {
    const sandbox = new Sandbox(config);
    expect(() => sandbox.addGlobal('_', {})).toThrow('Global "_" already exists');
  });

  it('should throw when adding a global with an invalid name', () => {
    const sandbox = new Sandbox(config);
    expect(() => sandbox.addGlobal('', 1)).toThrow('Global name must be a non-empty string');
    expect(() => sandbox.addGlobal(undefined as any, 1)).toThrow('Global name must be a non-empty string');
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

    const result = sandbox.evalWithArgs('(a) => await test(a)', [42], { isAsync: true, global: { test: async (a: number) => a + 1 } });
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
    let sandbox: Sandbox;

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
      let result: any;
      runInAsyncLocalStorage(() => {
        appendTraceMeta({ workflowTemplateId: 3 });
        result = sandbox.eval('() => $.workflow.testFunc("value")')();
      });
      expect(result).toBe('test-value');
    });

    it('should log and store a global function that fails to compile', () => {
      sandbox.updateWorkflowTemplateFunctions(4, { brokenFunc: '(value =>' });
      expect(log.save).toHaveBeenCalledWith(
        'sandbox-global-function-error',
        expect.objectContaining({ workflowTemplateId: 4, functionName: 'brokenFunc' }),
        'warn',
      );
      expect(() => sandbox.evalWithArgs('() => $.workflow.brokenFunc("value")', [], { workflowTemplateId: 4 })).toThrow(
        'Sandbox error: "$.workflow.brokenFunc is not a function"',
      );
    });

    it('should ignore non-string and empty-string global function values', () => {
      sandbox.updateWorkflowTemplateFunctions(5, { a: 1, b: '', c: '(value) => value' });
      expect(sandbox.workflowTemplateFunctions[5]).toEqual({ c: expect.any(Function) });
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

    it('should throw if models are not provided', async () => {
      const sandbox = new Sandbox(config);
      await expect(sandbox.init({})).rejects.toThrow('Models are required to initialize the sandbox.');
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

  describe('createContext / SandboxContext', () => {
    it('should evaluate code directly inside the isolate', () => {
      const sandbox = new Sandbox(config);
      const context = sandbox.createContext();
      expect(context.eval('1 + 1')).toBe(2);
    });

    it('should expose a value set via set() as a readable Reference inside the isolate', () => {
      const sandbox = new Sandbox(config);
      const context = sandbox.createContext();
      context.set('obj', { a: 42 });
      expect(context.eval('obj.getSync("a")')).toBe(42);
    });

    it('should expose a function set via set() as a callable Reference inside the isolate', () => {
      const sandbox = new Sandbox(config);
      const context = sandbox.createContext();
      context.set('double', (n: number) => n * 2);
      expect(context.eval('double.applySync(undefined, [21])')).toBe(42);
    });

    it('should allow chaining set() calls', () => {
      const sandbox = new Sandbox(config);
      const context = sandbox.createContext();
      const chained = context.set('a', 1).set('b', 2);
      expect(chained).toBe(context);
      expect(context.eval('typeof a')).toBe('object');
      expect(context.eval('typeof b')).toBe('object');
    });

    it('should isolate separate contexts from the same sandbox from each other', () => {
      const sandbox = new Sandbox(config);
      const contextA = sandbox.createContext();
      const contextB = sandbox.createContext();

      contextA.set('a', 1);

      expect(contextA.eval('typeof a')).toBe('object');
      expect(contextB.eval('typeof a')).toBe('undefined');
    });
  });

  describe('isolationLevel: isolated-vm', () => {
    const vmConfig = { ...config, isolationLevel: SandboxIsolationLevel.IsolatedVm };

    it('should execute a simple code', () => {
      const sandbox = new Sandbox(vmConfig);
      expect(sandbox.eval('1 + 1')).toBe(2);
    });

    it('should execute a code with arguments via evalWithArgs', () => {
      const sandbox = new Sandbox(vmConfig);
      const result = sandbox.evalWithArgs('(a, b) => a + b', [1, 2]);
      expect(result).toBe(3);
    });

    it('should operate on plain object/array arguments via evalWithArgs', () => {
      const sandbox = new Sandbox(vmConfig);
      const result = sandbox.evalWithArgs('(items) => items.filter((i) => i.active).map((i) => i.name)', [
        [
          { name: 'a', active: true },
          { name: 'b', active: false },
          { name: 'c', active: true },
        ],
      ]);
      expect(result).toEqual(['a', 'c']);
    });

    it('should eval the same real business process example as function isolation', () => {
      const sandbox = new Sandbox(vmConfig);
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

    it('should bridge sync default global helpers', () => {
      const sandbox = new Sandbox(vmConfig);
      expect(sandbox.evalWithArgs('() => getMd5Hash("test")', [])).toBe('098f6bcd4621d373cade4e832627b4f6');
      expect(sandbox.evalWithArgs('() => base64Encode("hello")', [])).toBe('aGVsbG8=');
      expect(sandbox.evalWithArgs('() => toBase64("hello")', [])).toBe('aGVsbG8=');
      expect(sandbox.evalWithArgs('() => typeof randomUUID()', [])).toBe('string');
    });

    it('should await bridged async globals passed via evalWithArgs options', async () => {
      const sandbox = new Sandbox(vmConfig);
      const result = sandbox.evalWithArgs('(a) => test(a)', [42], {
        isAsync: true,
        global: { test: async (a: number) => a + 1 },
      });
      // isolated-vm's native Promise is a different realm from Jest's, so assert duck-typed
      // thenable-ness here rather than `toBeInstanceOf(Promise)`.
      expect(typeof result.then).toBe('function');
      await expect(result).resolves.toBe(43);
    });

    it('should automatically add "async" to functions if isAsync is true', async () => {
      const sandbox = new Sandbox(vmConfig);
      const result = sandbox.evalWithArgs('(a) => await test(a)', [42], { isAsync: true, global: { test: async (a: number) => a + 1 } });
      expect(typeof result.then).toBe('function');
      await expect(result).resolves.toBe(43);
    });

    it('should use workflow template global functions, sync and async', async () => {
      const sandbox = new Sandbox(vmConfig);

      const models = {
        models: {
          workflowTemplate: {
            model: {
              findAll: jest.fn().mockResolvedValue([
                { id: 1, data: { globalFunctions: { greet: '(name) => `hi ${name}`' } } },
                { id: 2, data: { globalFunctions: { greetAsync: 'async (name) => `hi ${name}`' } } },
              ]),
            },
          },
        },
      };
      await sandbox.init(models);

      expect(sandbox.evalWithArgs('() => $.workflow.greet("bob")', [], { workflowTemplateId: 1 })).toBe('hi bob');

      // The automatic bare-identifier `await` transform only recognizes top-level global names,
      // not nested paths like `$.workflow.greetAsync`, so the caller awaits it explicitly here —
      // same requirement as function isolation, just more strictly enforced: crossing the
      // isolate boundary can't structured-clone an un-awaited Promise.
      const asyncResult = sandbox.evalWithArgs('async (name) => await $.workflow.greetAsync(name)', ['bob'], {
        workflowTemplateId: 2,
        isAsync: true,
      });
      await expect(asyncResult).resolves.toBe('hi bob');
    });

    it('should not leak assignments to predefined host globals, unlike function isolation', () => {
      const original = (fetch as any).toString();
      const sandbox = new Sandbox(vmConfig);

      sandbox.eval('fetch = function() { return "hijacked"; }')();

      expect((fetch as any).toString()).toBe(original);
    });

    it('should not expose the host global object', () => {
      const sandbox = new Sandbox(vmConfig);
      expect(sandbox.eval('typeof process')).toBe('undefined');
      expect(sandbox.eval('typeof require')).toBe('undefined');
    });

    it('should not expose rich library namespaces (_, iconv, moment, crypto)', () => {
      const sandbox = new Sandbox(vmConfig);
      expect(sandbox.eval('typeof _')).toBe('undefined');
      expect(sandbox.eval('typeof iconv')).toBe('undefined');
      expect(sandbox.eval('typeof moment')).toBe('undefined');
      expect(sandbox.eval('typeof crypto')).toBe('undefined');
    });

    it('should support a custom global added via addGlobal', () => {
      const sandbox = new Sandbox(vmConfig);
      sandbox.addGlobal('double', (n: number) => n * 2);
      expect(sandbox.evalWithArgs('(n) => double(n)', [21])).toBe(42);
    });

    it('should wrap syntax errors the same way as function isolation', () => {
      const sandbox = new Sandbox(vmConfig);
      expect(() => sandbox.evalWithArgs("(documents, events) => { return 'Тестовий юніт; }", [])).toThrow(/^Sandbox error: /);
    });

    it('should wrap runtime errors the same way as function isolation', () => {
      const sandbox = new Sandbox(vmConfig);
      expect(() => sandbox.evalWithArgs('() => { throw new Error("boom"); }', [])).toThrow('Sandbox error: "boom"');
    });

    it('should reuse the compiled function for identical code and options', () => {
      const sandbox = new Sandbox(vmConfig);
      const first = sandbox.eval('() => 1');
      const second = sandbox.eval('() => 1');
      expect(second).toBe(first);
    });
  });
});
