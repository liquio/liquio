import * as nodeCrypto from 'node:crypto';
import * as os from 'node:os';

import iconv from 'iconv-lite';
import moment from 'moment';

import { Sandbox, SandboxIsolationLevel } from './index';
import * as isolated from './isolated';

const { runInIsolate } = isolated;

(global as any).log = { save: jest.fn() };

describe('runInIsolate', () => {
  afterEach(() => {
    delete (global as any).__isolateProbe;
  });

  it('should run arrow function with arguments', () => {
    expect(runInIsolate('(a, b) => a + b', [1, 2])).toBe(3);
  });

  it('should run function expression and return copied object', () => {
    const result = runInIsolate('(function ({ userInfo }) { return { name: userInfo.firstName, tags: [1, 2] }; })', [
      { userInfo: { firstName: 'Ivan' } },
    ]);
    expect(result).toEqual({ name: 'Ivan', tags: [1, 2] });
  });

  it('should pass arguments as copies', () => {
    const arg = { a: 1 };
    runInIsolate('(x) => { x.a = 2; return x; }', [arg]);
    expect(arg).toEqual({ a: 1 });
  });

  it('should provide lodash and moment', () => {
    expect(runInIsolate('(o) => _.get(o, "a.b")', [{ a: { b: 5 } }])).toBe(5);
    expect(runInIsolate('() => moment("2026-09-28").format("DD.MM.YYYY")')).toBe('28.09.2026');
  });

  [
    ['require', '() => typeof require'],
    ['process', '() => typeof process'],
    ['module', '() => typeof module'],
  ].forEach(([name, code]) => {
    it(`should not expose host "${name}"`, () => {
      expect(runInIsolate(code)).toBe('undefined');
    });
  });

  [
    ['arrow constructor', '() => (() => {}).constructor("return typeof process")()'],
    ['object constructor', '() => ({}).constructor.constructor("return typeof process")()'],
    ['globalThis', '() => typeof globalThis.process'],
  ].forEach(([name, code]) => {
    it(`should not escape to host via ${name}`, () => {
      expect(runInIsolate(code)).toBe('undefined');
    });
  });

  // The raw engine runs code without `guardCode`, so these check the isolate barrier itself: indirect `eval` and a
  // sloppy-mode `this` resolve to the isolate's own global object, never the host one.
  [
    ['indirect eval', '() => (0,eval)("typeof process")'],
    ['global object from indirect eval', '() => typeof (0,eval)("this").process'],
    ['Function from indirect eval', '() => (0,eval)("this.Function")("return typeof process")()'],
    ['sloppy-mode this', '() => typeof (function () { return this; })().process'],
  ].forEach(([name, code]) => {
    it(`should not escape to host via ${name}`, () => {
      expect(runInIsolate(code)).toBe('undefined');
    });
  });

  it('should not load host modules via dynamic import()', () => {
    // Fails with "Not supported" (no module loader in the isolate) or, if it gets that far, a non-copyable Promise.
    expect(() => runInIsolate('() => import("fs")')).toThrow();
    expect(() => runInIsolate('() => import("child_process").then((m) => typeof m.execSync)')).toThrow();
  });

  it('should not escape to host via constructor with require', () => {
    const code = '() => (() => {}).constructor("return process")().mainModule.require("os").hostname()';
    expect(() => runInIsolate(code)).toThrow();
  });

  it('should not affect host global', () => {
    runInIsolate('() => { globalThis.__isolateProbe = true; global = 1; }');
    expect((global as any).__isolateProbe).toBeUndefined();
  });

  it('should not leak host data into error messages', () => {
    const error = (() => {
      try {
        runInIsolate('() => { throw new Error("x:" + (typeof process)); }');
      } catch (e) {
        return e;
      }
    })();
    expect(error.message).toContain('x:undefined');
    expect(error.message).not.toContain(os.hostname());
  });

  it('should stop infinite loop by timeout', () => {
    expect(() => runInIsolate('() => { while (true) {} }', [], { timeout: 100 })).toThrow(/timed out/i);
  });

  it('should stop infinite loop in evaluated code by timeout', () => {
    expect(() => runInIsolate('(() => { while (true) {} })()', [], { timeout: 100 })).toThrow(/timed out/i);
  });

  it('should throw if code is not a function', () => {
    expect(() => runInIsolate('1 + 1')).toThrow('Code did not evaluate to a function.');
  });

  it('should throw if result is not copyable', () => {
    expect(() => runInIsolate('() => () => 1')).toThrow();
  });

  it('should throw for empty code', () => {
    expect(() => runInIsolate('')).toThrow('Code must be a non-empty string.');
    expect(() => runInIsolate(undefined)).toThrow('Code must be a non-empty string.');
  });

  it('should not share state between calls', () => {
    runInIsolate('() => { globalThis.shared = 1; }');
    expect(runInIsolate('() => typeof shared')).toBe('undefined');
  });
});

describe('Sandbox with isolated-vm isolation level', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = new Sandbox({ isolationLevel: SandboxIsolationLevel.IsolatedVm, isolated: { timeout: 1000 } });
  });

  afterEach(() => {
    delete (global as any).__isolateProbe;
  });

  // `guardCode` blocks direct `.constructor` access, so the isolate barrier itself is checked through a constructor
  // read the static analysis does not see (`x.constructor.constructor` equivalent).
  const ctorChain = (expr) =>
    '(() => { const ctor = (v) => Object.getOwnPropertyDescriptor(Object.getPrototypeOf(v), "constr" + "uctor").value; ' +
    `return ctor(ctor(${expr}))("return typeof process")(); })()`;

  it('should block direct constructor access', () => {
    expect(() => sandbox.evalWithArgs('() => [].constructor.constructor("return typeof process")()', [])).toThrow(
      'Access to "constructor" is blocked',
    );
  });

  [
    ['array constructor chain', `() => ${ctorChain('[]')}`],
    ['default helper', `() => ${ctorChain('getMd5Hash')}`],
    ['log callback', `() => ${ctorChain('log')}`],
    ['console method', `() => ${ctorChain('console.log')}`],
    ['host global function', `() => ${ctorChain('hostFn')}`],
    ['async host global function', `() => ${ctorChain('hostAsyncFn')}`],
    ['argument', `(arg) => ${ctorChain('arg')}`],
  ].forEach(([name, code]) => {
    it(`should not reach host process via ${name}`, () => {
      const result = sandbox.evalWithArgs(code, [{ a: 1 }], {
        global: { hostFn: () => 1, hostAsyncFn: async () => 1 },
      });
      expect(result).toBe('undefined');
    });
  });

  it('should block eval and dynamic import() by static analysis', () => {
    expect(() => sandbox.evalWithArgs('() => (0,eval)("typeof process")', [])).toThrow('Access to "eval" is blocked');
    expect(() => sandbox.evalWithArgs('() => import("fs")', [])).toThrow('Access to "import()" is blocked');
  });

  // `eval`/`Function` read by a computed key from the global object are not seen by the static analysis, so the
  // isolate barrier itself must hold: they are the isolate's own, without host access.
  [
    ['global object from sloppy-mode this', '() => typeof (function () { return this; })().process'],
    ['eval from the global object', '() => (function () { return this; })()["ev" + "al"]("typeof process")'],
    ['Function from the global object', '() => (function () { return this; })()["Func" + "tion"]("return typeof process")()'],
  ].forEach(([name, code]) => {
    it(`should not reach host process via ${name}`, () => {
      expect(sandbox.evalWithArgs(code, [])).toBe('undefined');
    });
  });

  // The isolate has its own, unguarded lodash (the guarded `_` and its path hardening are the `function` level only).
  // Lodash helpers that compile code or resolve string paths must still only reach the isolate's own `Function`.
  [
    ['_.template', '() => _.template("<%= typeof process %>")()'],
    ['_.template print', '() => _.template("<% print(typeof globalThis.process) %>")()'],
    ['_.get string path', '() => _.get([], "constructor.constructor")("return typeof process")()'],
    ['_.get array path', '() => _.get([], ["constr" + "uctor", "constr" + "uctor"])("return typeof process")()'],
    ['_.property', '() => _.property("constructor.constructor")([])("return typeof process")()'],
    ['_.invoke', '() => _.invoke([], "constructor.constructor", "return typeof process")()'],
  ].forEach(([name, code]) => {
    it(`should not reach host process via lodash ${name}`, () => {
      expect(sandbox.evalWithArgs(code, [])).toBe('undefined');
    });
  });

  it('should not pollute host prototypes via lodash path helpers', () => {
    sandbox.evalWithArgs(
      '() => { _.set({}, "constructor.prototype.__isolateProbe", 1); _.merge({}, JSON.parse(\'{"__proto__":{"__isolateProbe":1}}\')); }',
      [],
    );
    expect(({} as any).__isolateProbe).toBeUndefined();
    expect((Object.prototype as any).__isolateProbe).toBeUndefined();
  });

  it('should not expose host modules', () => {
    expect(sandbox.evalWithArgs('() => [typeof require, typeof module, typeof crypto.createCipheriv, typeof crypto.pbkdf2].join()', [])).toBe(
      'undefined,undefined,function,undefined',
    );
    expect(() => sandbox.evalWithArgs('() => crypto.createCipheriv("aes-256-cbc")', [])).toThrow(
      'crypto.createCipheriv is not available in sandbox.',
    );
  });

  [
    ['crypto.createHash', `() => ${ctorChain('crypto.createHash')}`],
    ['hash instance', `() => ${ctorChain('crypto.createHash("md5").digest')}`],
    ['iconv.decode', `() => ${ctorChain('iconv.decode')}`],
    ['Buffer', `() => ${ctorChain('Buffer.from("a").toString')}`],
  ].forEach(([name, code]) => {
    it(`should not reach host process via ${name} shim`, () => {
      expect(sandbox.evalWithArgs(code, [])).toBe('undefined');
    });
  });

  it('should provide Node.js compatible crypto hashes', () => {
    expect(sandbox.evalWithArgs('(s) => crypto.createHash("md5").update(s).digest("hex")', ['тест'])).toBe(
      nodeCrypto.createHash('md5').update('тест').digest('hex'),
    );
    expect(sandbox.evalWithArgs('(s) => crypto.createHash("sha256").update(s).update("2").digest("base64")', ['a'])).toBe(
      nodeCrypto.createHash('sha256').update('a').update('2').digest('base64'),
    );
    expect(sandbox.evalWithArgs('(s) => crypto.createHmac("sha512", "key").update(s).digest("hex")', ['a'])).toBe(
      nodeCrypto.createHmac('sha512', 'key').update('a').digest('hex'),
    );
    expect(sandbox.evalWithArgs('() => crypto.createHash("sha1").update(Buffer.from("616263", "hex")).digest().toString("hex")', [])).toBe(
      nodeCrypto.createHash('sha1').update('abc').digest('hex'),
    );
    expect(sandbox.evalWithArgs('() => [crypto.randomBytes(16).length, /^[0-9a-f-]{36}$/.test(crypto.randomUUID())]', [])).toEqual([16, true]);
    expect(() => sandbox.evalWithArgs('() => crypto.randomBytes(1e9)', [])).toThrow(/randomBytes size/);
  });

  it('should keep default hash helpers', () => {
    expect(sandbox.evalWithArgs('() => [getMd5Hash("test"), base64Encode("тест"), base64Decode(base64Encode("тест")), typeof uuid()]', [])).toEqual([
      '098f6bcd4621d373cade4e832627b4f6',
      Buffer.from('тест').toString('base64'),
      'тест',
      'string',
    ]);
  });

  it('should provide Buffer', () => {
    expect(sandbox.evalWithArgs('(s) => Buffer.from(Buffer.from(s).toString("base64"), "base64").toString("utf8")', ['Привіт'])).toBe('Привіт');
    expect(sandbox.evalWithArgs('() => [Buffer.isBuffer(Buffer.alloc(2)), Buffer.byteLength("ї")]', [])).toEqual([true, 2]);
  });

  it('should provide iconv', () => {
    const win1251 = iconv.encode('Привіт', 'win1251');
    expect(sandbox.evalWithArgs('(b) => iconv.decode(Buffer.from(b), "win1251")', [win1251])).toBe('Привіт');
    expect(sandbox.evalWithArgs('(s) => iconv.encode(s, "win1251").toString("hex")', ['Привіт'])).toBe(win1251.toString('hex'));
    expect(sandbox.evalWithArgs('() => [iconv.encodingExists("cp866"), iconv.encodingExists("nope")]', [])).toEqual([true, false]);
  });

  it('should provide atob, btoa, TextEncoder and TextDecoder', () => {
    expect(sandbox.evalWithArgs('() => [btoa("abc"), atob("YWJj")]', [])).toEqual(['YWJj', 'abc']);
    expect(sandbox.evalWithArgs('(s) => new TextDecoder().decode(new TextEncoder().encode(s))', ['Привіт'])).toBe('Привіт');
  });

  it('should provide structuredClone', () => {
    const document = { data: { list: [{ a: 1 }], date: new Date('2024-01-02T00:00:00.000Z') } };
    expect(
      sandbox.evalWithArgs(
        '(d) => { const c = structuredClone(d); c.data.list[0].a = 2; return [d.data.list[0].a, c.data.list[0].a, c.data.date instanceof Date, c.data.date.toISOString()]; }',
        [document],
      ),
    ).toEqual([1, 2, true, '2024-01-02T00:00:00.000Z']);
    expect(
      sandbox.evalWithArgs(
        `() => {
      const o = { m: new Map([['k', new Set([1])]]), r: /a/gi, b: Buffer.from('ab'), u: new Uint16Array([1, 2]) };
      o.self = o;
      const c = structuredClone(o);
      return [c.self === c, c !== o, c.m.get('k').has(1), c.r.flags, c.b instanceof Uint8Array, Buffer.isBuffer(c.b), c.b[1], c.u instanceof Uint16Array, c.u[1]];
    }`,
        [],
      ),
    ).toEqual([true, true, true, 'gi', true, false, 98, true, 2]);
    expect(
      sandbox.evalWithArgs(
        '() => { class A { constructor() { this.x = 1; } } const c = structuredClone(new A()); return [Object.getPrototypeOf(c) === Object.getPrototypeOf({}), c.x]; }',
        [],
      ),
    ).toEqual([true, 1]);
    expect(() => sandbox.evalWithArgs('() => structuredClone({ f() {} })', [])).toThrow(/could not be cloned/);
  });

  it('should not pollute host built-in prototypes', () => {
    sandbox.evalWithArgs('() => { Object.getPrototypeOf([]).join = () => "pwned"; Object.getPrototypeOf({}).__isolateProbe = 1; }', []);
    expect([1, 2].join()).toBe('1,2');
    expect(({} as any).__isolateProbe).toBeUndefined();
  });

  it('should not share prototypes between workflow template scopes', () => {
    sandbox.evalWithArgs('() => { Object.getPrototypeOf([]).join = () => "pwned"; }', [], { workflowTemplateId: 1 });
    expect(sandbox.evalWithArgs('(a) => a.join("-")', [[1, 2]])).toBe('1-2');
  });

  it('should pass arguments as copies', () => {
    const arg = { a: 1, nested: { b: 1 } };
    sandbox.evalWithArgs('(x) => { x.a = 2; x.nested.b = 2; }', [arg]);
    expect(arg).toEqual({ a: 1, nested: { b: 1 } });
  });

  it('should pass host function arguments as copies', () => {
    const received = [];
    sandbox.evalWithArgs('() => { const o = { a: 1 }; hostFn(o); return o.a; }', [], {
      global: {
        hostFn: (o) => {
          received.push(o);
          o.a = 2;
        },
      },
    });
    expect(received).toEqual([{ a: 2 }]);
    expect(
      sandbox.evalWithArgs('() => { const o = { a: 1 }; hostFn(o); return o.a; }', [], {
        global: {
          hostFn: (o) => {
            o.a = 2;
          },
        },
        meta: { fn: 'other' },
      }),
    ).toBe(1);
  });

  it('should call sync and async host functions', async () => {
    const result = await sandbox.evalWithArgs('async (a) => syncFn(a) + await asyncFn(a)', [2], {
      isAsync: true,
      global: { syncFn: (a) => a * 10, asyncFn: async (a) => a * 100 },
    });
    expect(result).toBe(220);
  });

  it('should support nested host functions in globals', () => {
    const result = sandbox.evalWithArgs('() => helpers.fn(helpers.data.x)', [], {
      global: { helpers: { fn: (x) => x + 1, data: { x: 1 } } },
    });
    expect(result).toBe(2);
  });

  it('should copy Date and moment arguments as Date', () => {
    const date = new Date('2026-10-05T00:00:00.000Z');
    expect(sandbox.evalWithArgs('(d, m) => [d instanceof Date, m instanceof Date, d.toISOString()]', [date, moment(date)])).toEqual([
      true,
      true,
      '2026-10-05T00:00:00.000Z',
    ]);
  });

  it('should restore methods and getters of class instances (entities)', () => {
    // Shaped like the task component entities: methods calling other methods, inherited from a base entity.
    class Entity {
      constructor(data) {
        Object.assign(this, data);
      }
    }
    class TaskEntity extends Entity {
      performerUsers: string[];
      performerUnits: number[];
      signerUsers: string[];
      isSigner(userId) {
        return this.signerUsers.includes(userId);
      }
      isPerformerDirectly(userId) {
        return this.performerUsers.includes(userId);
      }
      isPerformer(userId, userUnitIds = []) {
        return this.isPerformerDirectly(userId) || this.performerUnits.some((unitId) => userUnitIds.includes(unitId));
      }
    }
    class UnitEntity extends Entity {
      heads: string[];
      members: string[];
      getHeadsAndMembers() {
        return [...new Set([...this.heads, ...this.members])];
      }
    }
    const task = new TaskEntity({ id: 't1', performerUsers: ['u1'], performerUnits: [5], signerUsers: ['u2'], data: {} });
    const unit = new UnitEntity({ id: 5, heads: ['h1'], members: ['m1', 'h1'] });
    expect(
      sandbox.evalWithArgs(
        '(task, units) => [task.isPerformer("u1"), task.isPerformer("x", [5]), task.isSigner("u2"), units[0].getHeadsAndMembers(), task.id]',
        [task, [unit]],
      ),
    ).toEqual([true, true, true, ['h1', 'm1'], 't1']);

    class WithGetter {
      a: number;
      constructor() {
        this.a = 2;
      }
      get double() {
        return this.a * 2;
      }
    }
    expect(sandbox.evalWithArgs('(o) => o.double', [new WithGetter()])).toBe(4);
  });

  it('should not allow user code to define or change class prototypes', () => {
    class Entity {
      id: number;
      constructor() {
        this.id = 1;
      }
      getId() {
        return this.id;
      }
    }
    expect(sandbox.evalWithArgs('() => { __sandboxRuntime.defineClass("x", "Entity", { getId: () => "pwned" }); }', [])).toBeUndefined();
    expect(
      sandbox.evalWithArgs('(e) => { try { Object.getPrototypeOf(e).getId = () => "pwned"; } catch {} return e.getId(); }', [new Entity()]),
    ).toBe(1);
    expect(sandbox.evalWithArgs('(e) => e.getId()', [new Entity()])).toBe(1);
  });

  it('should parse ISO dates with offsets like host moment', () => {
    const dates = ['2026-10-05T10:00:00Z', '2026-10-05T10:00:00+02:00', '2026-10-05T10:00:00.123-05:30', '2026-10-05'];
    expect(sandbox.evalWithArgs('(d) => d.map((v) => moment(v).toISOString())', [dates])).toEqual(dates.map((v) => moment(v).toISOString()));
    expect(runInIsolate('(d) => moment(d).toISOString()', ['2026-10-05T10:00:00Z'])).toBe('2026-10-05T10:00:00.000Z');
  });

  it('should return moment as Date and drop functions from result', () => {
    const result = sandbox.evalWithArgs('() => ({ at: moment("2026-10-05T10:00:00Z"), fn: () => 1, nested: { list: [() => 1, 2] } })', []);
    expect(result.at).toBeInstanceOf(Date);
    expect(result.at.toISOString()).toBe('2026-10-05T10:00:00.000Z');
    expect(result).not.toHaveProperty('fn');
    expect(result.nested.list).toEqual([undefined, 2]);
    expect(sandbox.evalWithArgs('() => moment("2026-10-05T10:00:00Z")', [])).toBeInstanceOf(Date);
  });

  it('should pass Buffer to host functions and return Buffer to host', async () => {
    const received = [];
    const result = await sandbox.evalWithArgs(
      'async (b) => { await getHash(Buffer.from("abc")); syncFn(b); return Buffer.from("xyz"); }',
      [Buffer.from('q')],
      {
        isAsync: true,
        global: {
          getHash: async (data) => {
            received.push(Buffer.isBuffer(data) && data.toString());
          },
          syncFn: (data) => {
            received.push(Buffer.isBuffer(data) && data.toString());
          },
        },
      },
    );
    expect(received).toEqual(['abc', 'q']);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe('xyz');
    expect(sandbox.evalWithArgs('(b) => Buffer.isBuffer(b)', [Buffer.from('a')])).toBe(true);
  });

  it('should keep message of non-Error throws', () => {
    expect(() => sandbox.evalWithArgs('() => { throw "custom message"; }', [])).toThrow('custom message');
    expect(() => sandbox.evalWithArgs('() => { throw { code: 42 }; }', [])).toThrow('{"code":42}');
  });

  it('should share default global object within a workflow template', () => {
    sandbox.evalWithArgs('() => { global.counter = 41; }', [], { workflowTemplateId: 10 });
    expect(sandbox.evalWithArgs('() => global.counter + 1', [], { workflowTemplateId: 10 })).toBe(42);
    expect(sandbox.evalWithArgs('() => global.counter', [], { workflowTemplateId: 11 })).toBeUndefined();
  });

  it('should not copy undeclared arguments (e.g. Array.filter index and array)', () => {
    const filter = sandbox.eval('(item) => item.ok');
    const items = [{ ok: true }, { ok: false }, { ok: true }];
    const transfer = jest.spyOn(isolated, 'toTransferable');
    expect(items.filter(filter)).toEqual([{ ok: true }, { ok: true }]);
    expect(sandbox.eval('function () { return arguments.length; }')(1, 2, 3)).toBe(3);
    transfer.mockRestore();
  });

  it('should provide workflow template global functions', async () => {
    sandbox.updateWorkflowTemplateFunctions(1, {
      double: '(a) => a * 2',
      asyncTriple: 'async (a) => a * 3',
    });
    expect(sandbox.evalWithArgs('(a) => $.workflow.double(a)', [2], { workflowTemplateId: 1 })).toBe(4);
    await expect(sandbox.evalWithArgs('async (a) => $.workflow.asyncTriple(a)', [2], { workflowTemplateId: 1, isAsync: true })).resolves.toBe(6);
    expect(() => sandbox.evalWithArgs('(a) => $.workflow.double(a)', [2], { workflowTemplateId: 2 })).toThrow('$.workflow.double is not a function');
  });

  it('should stop infinite loop by timeout', () => {
    expect(() => sandbox.evalWithArgs('() => { while (true) {} }', [])).toThrow(/timed out/i);
  });

  it('should release contexts evicted from cache', () => {
    const small = new Sandbox({ isolationLevel: SandboxIsolationLevel.IsolatedVm, lru_max: 1 });
    const release = jest.spyOn(small.isolatedEngine, 'release');
    small.evalWithArgs('(a) => a + 1', [1]);
    small.evalWithArgs('(a) => a + 2', [1]);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('should recover after isolate is disposed', () => {
    const fn = sandbox.eval('(a) => a + 1');
    expect(fn(1)).toBe(2);
    sandbox.isolatedEngine.getIsolate().dispose();
    expect(fn(1)).toBe(2);
  });
});

describe('Sandbox with isolated-vm isolation level scopes', () => {
  it('should share one context per workflow template', () => {
    const sandbox = new Sandbox({ isolationLevel: SandboxIsolationLevel.IsolatedVm });
    sandbox.evalWithArgs('(a) => a + 1', [1], { workflowTemplateId: 1 });
    sandbox.evalWithArgs('(a) => a + 2', [1], { workflowTemplateId: 1 });
    sandbox.evalWithArgs('(a) => a + 3', [1], { workflowTemplateId: 2 });
    expect([...(sandbox.isolatedEngine as any).scopes.keys()].filter((key) => key.startsWith(sandbox.scopeKeyPrefix))).toHaveLength(2);
  });

  it('should not share globals and prototypes between workflow templates', () => {
    const sandbox = new Sandbox({ isolationLevel: SandboxIsolationLevel.IsolatedVm });
    sandbox.evalWithArgs('() => { Object.getPrototypeOf([]).join = () => "pwned"; leak = 1; }', [], { workflowTemplateId: 1 });
    expect(sandbox.evalWithArgs('(a) => [a.join("-"), typeof leak]', [[1, 2]], { workflowTemplateId: 2 })).toEqual(['1-2', 'undefined']);
  });

  it('should not share code globals between functions of the same scope', () => {
    const sandbox = new Sandbox({ isolationLevel: SandboxIsolationLevel.IsolatedVm });
    sandbox.evalWithArgs('() => hostFn()', [], { workflowTemplateId: 1, global: { hostFn: () => 1 } });
    expect(sandbox.evalWithArgs('() => typeof hostFn', [], { workflowTemplateId: 1 })).toBe('undefined');
  });

  it('should reuse compiled function for different meta', () => {
    const sandbox = new Sandbox({ isolationLevel: SandboxIsolationLevel.IsolatedVm });
    const compile = jest.spyOn(sandbox.isolatedEngine, 'compile');
    sandbox.evalWithArgs('(a) => a + 1', [1], { meta: { documentId: 'a' } });
    sandbox.evalWithArgs('(a) => a + 1', [2], { meta: { documentId: 'b' } });
    expect(compile).toHaveBeenCalledTimes(1);
  });

  it('should not reuse compiled function with host functions for different meta', () => {
    const sandbox = new Sandbox({ isolationLevel: SandboxIsolationLevel.IsolatedVm });
    const first = sandbox.evalWithArgs('() => getFileHash()', [], { global: { getFileHash: () => 'a' }, meta: { documentId: 'a' } });
    const second = sandbox.evalWithArgs('() => getFileHash()', [], { global: { getFileHash: () => 'b' }, meta: { documentId: 'b' } });
    expect([first, second]).toEqual(['a', 'b']);
  });

  it('should use updated workflow template functions', () => {
    const sandbox = new Sandbox({ isolationLevel: SandboxIsolationLevel.IsolatedVm });
    sandbox.updateWorkflowTemplateFunctions(1, { fn: '() => 1' });
    const fn = sandbox.eval('() => $.workflow.fn()', { workflowTemplateId: 1 });
    expect(fn()).toBe(1);
    sandbox.updateWorkflowTemplateFunctions(1, { fn: '() => 2' });
    expect(fn()).toBe(2);
  });

  it('should recompile functions of released scope', () => {
    const sandbox = new Sandbox({ isolationLevel: SandboxIsolationLevel.IsolatedVm, isolated: { maxScopes: 1 } });
    const fn = sandbox.eval('(a) => a + 1', { workflowTemplateId: 1 });
    sandbox.eval('(a) => a + 2', { workflowTemplateId: 2 });
    expect((sandbox.isolatedEngine as any).scopes.size).toBe(1);
    expect(fn(1)).toBe(2);
  });
});
