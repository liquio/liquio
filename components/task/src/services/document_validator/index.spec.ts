import { Sandbox, appendTraceMeta, runInAsyncLocalStorage } from '@liquio/back-core';

import { DocumentValidatorService } from './index';
import { Keywords } from './keywords';

// Suppress missing log references in validation keywords
global.log = { save: jest.fn() } as any;

describe('DocumentValidatorService.check', () => {
  beforeEach(() => {
    global.config = {
      register: {
        server: 'testserver',
        port: 'testport',
        token: 'testtoken',
        timeout: 1000,
      },
    };
    new Sandbox(global.config);
    Keywords.init();
  });
  afterEach(() => {
    global.config = {};
    jest.clearAllMocks();
  });

  test('should return no errors for simple valid object schema', async () => {
    const simpleSchema = {
      type: 'object',
      properties: {
        foo: { type: 'number' },
      },
      required: ['foo'],
    };
    const service = new DocumentValidatorService(simpleSchema, {}, {});
    const errors = await service.check({ foo: 42 }, false);
    expect(errors).toEqual([]);
  });

  test('should return no errors for nested valid object schema', async () => {
    const nestedSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: { type: 'string' },
          },
          required: ['b'],
        },
      },
      required: ['a'],
    };
    const service = new DocumentValidatorService(nestedSchema, {}, {});
    const errors = await service.check({ a: { b: 'value' } }, false);
    expect(errors).toEqual([]);
  });
});

describe('DocumentValidatorService.check with workflow template global functions', () => {
  const schema = {
    type: 'object',
    properties: {
      step1: {
        type: 'object',
        properties: {
          fieldA: { type: 'string', checkValid: '(value) => $.workflow.isOk(value)' },
          fieldB: { type: 'string', checkValid: '(value) => value === "ok"', hidden: '(document) => $.workflow.isHidden(document)' },
        },
      },
    },
  };

  // Run `fn` inside an async local storage whose trace meta carries `workflowTemplateId`, as the
  // businesses do once they have looked the document/task up.
  const withWorkflowTemplateId = <T>(workflowTemplateId: number, fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      runInAsyncLocalStorage(() => {
        appendTraceMeta({ workflowTemplateId });
        fn().then(resolve, reject);
      });
    });

  beforeEach(() => {
    global.config = {
      register: { server: 'testserver', port: 'testport', token: 'testtoken', timeout: 1000 },
    };
    const sandbox = new Sandbox(global.config);
    sandbox.updateWorkflowTemplateFunctions(3, {
      isOk: '(value) => value === "ok"',
      isHidden: '(document) => document.step1.fieldA === "ok"',
    });
    Keywords.init();
  });

  afterEach(() => {
    global.config = {};
    jest.clearAllMocks();
  });

  test('resolves $.workflow functions in keywords and hidden through the shared sandbox', async () => {
    const service = new DocumentValidatorService(schema, {}, {});
    const errors = await withWorkflowTemplateId(3, () => service.check({ step1: { fieldA: 'ok', fieldB: 'bad' } }, false));
    expect(errors).toEqual([]);
  });

  test('reports a keyword error computed by a $.workflow function', async () => {
    const service = new DocumentValidatorService(schema, {}, {});
    const errors = await withWorkflowTemplateId(3, () => service.check({ step1: { fieldA: 'bad' } }, false));
    expect(errors).toEqual([expect.objectContaining({ dataPath: 'step1.fieldA', message: 'checkValid error.' })]);
  });
});

describe('DocumentValidatorService.check cleanWhenHidden', () => {
  const makeSchema = (fieldA: Record<string, unknown>, step1: Record<string, unknown> = {}) => ({
    type: 'object',
    properties: {
      step1: {
        type: 'object',
        ...step1,
        properties: {
          toggle: { type: 'string' },
          fieldA: { type: 'string', checkValid: '(value) => value === "ok"', ...fieldA },
        },
      },
    },
  });

  beforeEach(() => {
    global.config = {
      register: { server: 'testserver', port: 'testport', token: 'testtoken', timeout: 1000 },
    };
    new Sandbox(global.config);
    Keywords.init();
  });

  afterEach(() => {
    global.config = {};
    jest.clearAllMocks();
  });

  test('keeps a keyword error of a field without cleanWhenHidden', async () => {
    const service = new DocumentValidatorService(makeSchema({ checkHidden: true }), {}, {});
    const errors = await service.check({ step1: { fieldA: 'bad' } }, false);
    expect(errors).toEqual([expect.objectContaining({ dataPath: 'step1.fieldA', message: 'checkValid error.', cleanWhenHidden: false })]);
  });

  test('keeps a keyword error of a cleanWhenHidden field that is not hidden', async () => {
    const service = new DocumentValidatorService(makeSchema({ cleanWhenHidden: true }), {}, {});
    const errors = await service.check({ step1: { fieldA: 'bad' } }, false);
    expect(errors).toEqual([expect.objectContaining({ dataPath: 'step1.fieldA', message: 'checkValid error.', cleanWhenHidden: true })]);
  });

  test('drops a keyword error of a cleanWhenHidden field with checkHidden: true', async () => {
    const service = new DocumentValidatorService(makeSchema({ cleanWhenHidden: true, checkHidden: true }), {}, {});
    const errors = await service.check({ step1: { fieldA: 'bad' } }, false);
    expect(errors).toEqual([]);
  });

  test('keeps a keyword error of a cleanWhenHidden field with checkHidden: false', async () => {
    const service = new DocumentValidatorService(makeSchema({ cleanWhenHidden: true, checkHidden: false }), {}, {});
    const errors = await service.check({ step1: { fieldA: 'bad' } }, false);
    expect(errors).toHaveLength(1);
  });

  test('drops a keyword error when the checkHidden function returns true for (value, parentValue)', async () => {
    const schema = makeSchema({ cleanWhenHidden: true, checkHidden: '(value, parentValue) => parentValue.toggle === "hide"' });
    const service = new DocumentValidatorService(schema, {}, {});
    const errors = await service.check({ step1: { toggle: 'hide', fieldA: 'bad' } }, false);
    expect(errors).toEqual([]);
  });

  test('keeps a keyword error when the checkHidden function returns false', async () => {
    const schema = makeSchema({ cleanWhenHidden: true, checkHidden: '(value, parentValue) => parentValue.toggle === "hide"' });
    const service = new DocumentValidatorService(schema, {}, {});
    const errors = await service.check({ step1: { toggle: 'show', fieldA: 'bad' } }, false);
    expect(errors).toHaveLength(1);
  });

  test('passes userInfo as the third checkHidden argument', async () => {
    const schema = makeSchema({ cleanWhenHidden: true, checkHidden: '(value, parentValue, userInfo) => userInfo.role === "guest"' });
    const service = new DocumentValidatorService(schema, {}, { role: 'guest' });
    const errors = await service.check({ step1: { fieldA: 'bad' } }, false);
    expect(errors).toEqual([]);
  });

  test('drops a keyword error of a cleanWhenHidden field whose parent has checkHidden: true', async () => {
    const service = new DocumentValidatorService(makeSchema({ cleanWhenHidden: true }, { checkHidden: true }), {}, {});
    const errors = await service.check({ step1: { fieldA: 'bad' } }, false);
    expect(errors).toEqual([]);
  });

  test('keeps an AJV error of a hidden cleanWhenHidden field (only keyword errors carry cleanWhenHidden)', async () => {
    const schema = makeSchema({ type: 'number', checkValid: undefined, cleanWhenHidden: true, checkHidden: true });
    const service = new DocumentValidatorService(schema, {}, {});
    const errors = await service.check({ step1: { fieldA: 'bad' } }, false);
    expect(errors).toEqual([expect.objectContaining({ dataPath: 'step1.fieldA', message: 'should be number' })]);
  });
});

describe('DocumentValidatorService.isCurrentOrParentControlsCheckReadonlyTrue', () => {
  const makeService = (schema) => {
    new Sandbox(global.config);
    return new DocumentValidatorService(schema, {}, {});
  };

  const makeProperty = (path, value) => ({
    path,
    value,
    jsonSchemaPath: path
      .split('.')
      .map((p) => `properties.${p}`)
      .join('.'),
  });

  beforeEach(() => {
    global.config = {
      register: { server: 'testserver', port: 'testport', token: 'testtoken', timeout: 1000 },
    };
    new Sandbox(global.config);
  });

  afterEach(() => {
    global.config = {};
    jest.clearAllMocks();
  });

  test('checkReadonly on direct field returns truthy when expression returns true', () => {
    const schema = {
      properties: { step1: { properties: { fieldA: { checkReadonly: '() => true' } } } },
    };
    const service = makeService(schema);
    const result = service.isCurrentOrParentControlsCheckReadonlyTrue(schema, makeProperty('step1.fieldA', 'val'), { step1: { fieldA: 'val' } });
    expect(result).toBe(true);
  });

  test('checkReadonly takes priority over checkReadOnly when both present', () => {
    const schema = {
      properties: {
        step1: {
          properties: {
            fieldA: { checkReadonly: '() => true', checkReadOnly: '() => false' },
          },
        },
      },
    };
    const service = makeService(schema);
    const result = service.isCurrentOrParentControlsCheckReadonlyTrue(schema, makeProperty('step1.fieldA', 'val'), { step1: { fieldA: 'val' } });
    expect(result).toBe(true);
  });

  test('checkReadonly returns false when expression returns false', () => {
    const schema = {
      properties: { step1: { properties: { fieldA: { checkReadonly: '() => false' } } } },
    };
    const service = makeService(schema);
    const result = service.isCurrentOrParentControlsCheckReadonlyTrue(schema, makeProperty('step1.fieldA', 'val'), { step1: { fieldA: 'val' } });
    expect(result).toBe(false);
  });

  test('returns undefined when neither checkReadonly nor checkReadOnly is defined', () => {
    const schema = {
      properties: { step1: { properties: { fieldA: { type: 'string' } } } },
    };
    const service = makeService(schema);
    const result = service.isCurrentOrParentControlsCheckReadonlyTrue(schema, makeProperty('step1.fieldA', 'val'), { step1: { fieldA: 'val' } });
    expect(result).toBeUndefined();
  });

  test('checkReadonly on parent group blocks nested field', () => {
    const schema = {
      properties: {
        step1: {
          properties: {
            group: {
              checkReadonly: '() => true',
              properties: { fieldA: { type: 'string' } },
            },
          },
        },
      },
    };
    const service = makeService(schema);
    const result = service.isCurrentOrParentControlsCheckReadonlyTrue(schema, makeProperty('step1.group.fieldA', 'val'), {
      step1: { group: { fieldA: 'val' } },
    });
    expect(result).toBe(true);
  });

  test('checkReadOnly boolean true on direct field returns true', () => {
    const schema = {
      properties: { step1: { properties: { fieldA: { checkReadOnly: true } } } },
    };
    const service = makeService(schema);
    const result = service.isCurrentOrParentControlsCheckReadonlyTrue(schema, makeProperty('step1.fieldA', 'val'), { step1: { fieldA: 'val' } });
    expect(result).toBe(true);
  });

  test('checkReadonly boolean true on parent group blocks nested field', () => {
    const schema = {
      properties: {
        step1: {
          properties: {
            group: {
              checkReadonly: true,
              properties: { fieldA: { type: 'string' } },
            },
          },
        },
      },
    };
    const service = makeService(schema);
    const result = service.isCurrentOrParentControlsCheckReadonlyTrue(schema, makeProperty('step1.group.fieldA', 'val'), {
      step1: { group: { fieldA: 'val' } },
    });
    expect(result).toBe(true);
  });

  test('checkReadonly boolean true on direct field returns true', () => {
    const schema = {
      properties: { step1: { properties: { fieldA: { checkReadonly: true } } } },
    };
    const service = makeService(schema);
    const result = service.isCurrentOrParentControlsCheckReadonlyTrue(schema, makeProperty('step1.fieldA', 'val'), { step1: { fieldA: 'val' } });
    expect(result).toBe(true);
  });

  test('checkReadOnly function on direct field receives (value, step, document)', () => {
    const schema = {
      properties: {
        step1: { properties: { fieldA: { checkReadOnly: '(value, step, document) => value === "val" && step.lock && document.step1.lock' } } },
      },
    };
    const service = makeService(schema);
    const result = service.isCurrentOrParentControlsCheckReadonlyTrue(schema, makeProperty('step1.fieldA', 'val'), {
      step1: { fieldA: 'old', lock: true },
    });
    expect(result).toBe(true);
  });
});

describe('DocumentValidatorService.removeReadonlyParams', () => {
  const makeService = (schema) => {
    new Sandbox(global.config);
    return new DocumentValidatorService(schema, {}, {});
  };

  const schema = {
    properties: {
      step1: {
        properties: {
          fieldA: { type: 'string' },
          fieldB: { type: 'string', readOnly: true },
        },
      },
    },
    calcTriggers: [{ target: 'step1.fieldB', source: 'step1.fieldA', calculate: 'value' }],
  };

  beforeEach(() => {
    global.config = {
      register: { server: 'testserver', port: 'testport', token: 'testtoken', timeout: 1000 },
    };
    new Sandbox(global.config);
  });

  afterEach(() => {
    global.config = {};
    jest.clearAllMocks();
  });

  test('strips a readOnly property when its path is not in triggerPath', async () => {
    const service = makeService(schema);
    const result = await service.removeReadonlyParams([{ path: 'step1.fieldB', value: 'X' }], { step1: { fieldB: 'old' } }, false);
    expect(result).toEqual([]);
  });

  test('keeps a readOnly property when its path is listed in triggerPath and is a genuine calcTrigger target', async () => {
    const service = makeService(schema);
    const result = await service.removeReadonlyParams([{ path: 'step1.fieldB', value: 'X' }], { step1: { fieldB: 'old' } }, false, ['step1.fieldB']);
    expect(result).toEqual([{ path: 'step1.fieldB', value: 'X' }]);
  });

  test('still strips a readOnly property listed in triggerPath when it is not a genuine calcTrigger target', async () => {
    const schemaWithoutTrigger = {
      properties: {
        step1: {
          properties: {
            fieldB: { type: 'string', readOnly: true },
          },
        },
      },
    };
    const service = makeService(schemaWithoutTrigger);
    const result = await service.removeReadonlyParams([{ path: 'step1.fieldB', value: 'X' }], { step1: { fieldB: 'old' } }, false, ['step1.fieldB']);
    expect(result).toEqual([]);
  });

  test('strips a readOnly calcTrigger target that is written but not listed in triggerPath', async () => {
    const service = makeService(schema);
    const result = await service.removeReadonlyParams(
      [
        { path: 'step1.fieldA', value: 'A' },
        { path: 'step1.fieldB', value: 'X' },
      ],
      { step1: { fieldB: 'old' } },
      false,
      ['step1.fieldA'],
    );
    expect(result).toEqual([{ path: 'step1.fieldA', value: 'A' }]);
  });

  test('keeps a checkReadonly: true calcTrigger target stripped even when it is listed in triggerPath', async () => {
    const checkReadonlyTargetSchema = {
      properties: { step1: { properties: { fieldA: { type: 'string' }, fieldB: { type: 'string', checkReadonly: true } } } },
      calcTriggers: [{ target: 'step1.fieldB', source: 'step1.fieldA', calculate: 'value' }],
    };
    const service = makeService(checkReadonlyTargetSchema);
    const result = await service.removeReadonlyParams([{ path: 'step1.fieldB', value: 'X' }], { step1: { fieldB: 'old' } }, false, ['step1.fieldB']);
    expect(result).toEqual([]);
  });

  test('strips a property with checkReadonly: true', async () => {
    const checkReadonlySchema = {
      properties: { step1: { properties: { fieldA: { type: 'string' }, fieldB: { type: 'string', checkReadonly: true } } } },
    };
    const service = makeService(checkReadonlySchema);
    const result = await service.removeReadonlyParams(
      [
        { path: 'step1.fieldA', value: 'A' },
        { path: 'step1.fieldB', value: 'X' },
      ],
      { step1: { fieldB: 'old' } },
      false,
    );
    expect(result).toEqual([{ path: 'step1.fieldA', value: 'A' }]);
  });

  test('strips a property with checkReadOnly: true', async () => {
    const checkReadOnlySchema = {
      properties: { step1: { properties: { fieldB: { type: 'string', checkReadOnly: true } } } },
    };
    const service = makeService(checkReadOnlySchema);
    const result = await service.removeReadonlyParams([{ path: 'step1.fieldB', value: 'X' }], { step1: { fieldB: 'old' } }, false);
    expect(result).toEqual([]);
  });

  test('keeps the previous value of an inner checkReadonly: true field when its parent object is written', async () => {
    const checkReadonlySchema = {
      properties: {
        step1: {
          properties: {
            group: { type: 'object', properties: { fieldA: { type: 'string' }, fieldB: { type: 'string', checkReadonly: true } } },
          },
        },
      },
    };
    const service = makeService(checkReadonlySchema);
    const result = await service.removeReadonlyParams(
      [{ path: 'step1.group', value: { fieldA: 'A', fieldB: 'X' } }],
      { step1: { group: { fieldB: 'old' } } },
      false,
    );
    expect(result).toEqual([{ path: 'step1.group', value: { fieldA: 'A', fieldB: 'old' } }]);
  });
});

describe('DocumentValidatorService.removeReadonlyParams with readOnly object and array calcTrigger targets', () => {
  const makeService = (schema) => {
    new Sandbox(global.config);
    return new DocumentValidatorService(schema, {}, {});
  };

  const schema = {
    properties: {
      calc: {
        properties: {
          input: { type: 'string' },
          result: { type: 'object', readOnly: true, properties: { name: { type: 'string' }, len: { type: 'number' } } },
          list: { type: 'array', readOnly: true, items: { type: 'string' } },
          group: {
            type: 'object',
            properties: { editable: { type: 'string' }, locked: { type: 'string', readOnly: true } },
          },
        },
      },
    },
    calcTriggers: [
      { source: 'calc.input', target: 'calc.result', calculate: '(value) => ({ name: value })', readOnly: true, validate: true },
      { source: 'calc.input', target: 'calc.list', calculate: '(value) => [value]', readOnly: true, validate: true },
    ],
  };

  beforeEach(() => {
    global.config = {
      register: { server: 'testserver', port: 'testport', token: 'testtoken', timeout: 1000 },
    };
    new Sandbox(global.config);
  });

  afterEach(() => {
    global.config = {};
    jest.clearAllMocks();
  });

  test('saves a readOnly object target listed in triggerPath as sent instead of emptying its inner fields', async () => {
    const service = makeService(schema);
    const result = await service.removeReadonlyParams([{ path: 'calc.result', value: { name: 'abc', len: 3 } }], { calc: {} }, false, [
      'calc.result',
    ]);
    expect(result).toEqual([{ path: 'calc.result', value: { name: 'abc', len: 3 } }]);
  });

  test('keeps leaf sub-paths of a readOnly object target listed in triggerPath', async () => {
    const service = makeService(schema);
    const result = await service.removeReadonlyParams(
      [
        { path: 'calc.input', value: 'abc' },
        { path: 'calc.result.name', value: 'abc' },
        { path: 'calc.result.len', value: 3 },
      ],
      { calc: { result: { name: 'old', len: 1 } } },
      false,
      ['calc.result.name', 'calc.result.len'],
    );
    expect(result).toEqual([
      { path: 'calc.input', value: 'abc' },
      { path: 'calc.result.name', value: 'abc' },
      { path: 'calc.result.len', value: 3 },
    ]);
  });

  test('keeps an item path of a readOnly array target listed in triggerPath', async () => {
    const service = makeService(schema);
    const result = await service.removeReadonlyParams([{ path: 'calc.list.2', value: 'c' }], { calc: { list: ['a', 'b'] } }, false, ['calc.list.2']);
    expect(result).toEqual([{ path: 'calc.list.2', value: 'c' }]);
  });

  test('strips a leaf sub-path of a readOnly object target that is not listed in triggerPath', async () => {
    const service = makeService(schema);
    const result = await service.removeReadonlyParams(
      [
        { path: 'calc.result.name', value: 'abc' },
        { path: 'calc.result.len', value: 3 },
      ],
      { calc: { result: { name: 'old', len: 1 } } },
      false,
      ['calc.result.name'],
    );
    expect(result).toEqual([{ path: 'calc.result.name', value: 'abc' }]);
  });

  test('still keeps the previous value of an inner readOnly field of an object that is not a calcTrigger target', async () => {
    const service = makeService(schema);
    const result = await service.removeReadonlyParams(
      [{ path: 'calc.group', value: { editable: 'new', locked: 'X' } }],
      { calc: { group: { editable: 'old', locked: 'kept' } } },
      false,
      [],
    );
    expect(result).toEqual([{ path: 'calc.group', value: { editable: 'new', locked: 'kept' } }]);
  });
});

describe('DocumentValidatorService.isCalcTriggerTargetPath', () => {
  const makeService = (schema) => {
    new Sandbox(global.config);
    return new DocumentValidatorService(schema, {}, {});
  };

  beforeEach(() => {
    global.config = {
      register: { server: 'testserver', port: 'testport', token: 'testtoken', timeout: 1000 },
    };
  });

  afterEach(() => {
    global.config = {};
  });

  test('matches a plain target path', () => {
    const service = makeService({
      properties: {},
      calcTriggers: [{ target: 'step1.fieldB', source: 'step1.fieldA', calculate: 'value' }],
    });
    expect(service.isCalcTriggerTargetPath('step1.fieldB')).toBe(true);
  });

  test('matches a `${index}`-templated target against a concrete array index', () => {
    const service = makeService({
      properties: {},
      calcTriggers: [{ target: 'step1.items.${index}.result', source: 'step1.items.${index}.value', calculate: 'value' }],
    });
    expect(service.isCalcTriggerTargetPath('step1.items.2.result')).toBe(true);
  });

  test('does not match an unrelated path', () => {
    const service = makeService({
      properties: {},
      calcTriggers: [{ target: 'step1.fieldB', source: 'step1.fieldA', calculate: 'value' }],
    });
    expect(service.isCalcTriggerTargetPath('step1.fieldC')).toBe(false);
  });

  test('does not match when there are no calcTriggers', () => {
    const service = makeService({ properties: {} });
    expect(service.isCalcTriggerTargetPath('step1.fieldB')).toBe(false);
  });

  test('does not match an action-based trigger (can never be recomputed/verified)', () => {
    const service = makeService({
      properties: {},
      calcTriggers: [{ target: 'step1.fieldB', source: 'step1.fieldA', action: 'someAction' }],
    });
    expect(service.isCalcTriggerTargetPath('step1.fieldB')).toBe(false);
  });

  test('does not match a trigger without a calculate function', () => {
    const service = makeService({
      properties: {},
      calcTriggers: [{ target: 'step1.fieldB', source: 'step1.fieldA' }],
    });
    expect(service.isCalcTriggerTargetPath('step1.fieldB')).toBe(false);
  });

  test('matches a leaf sub-path of an object target', () => {
    const service = makeService({
      properties: {},
      calcTriggers: [{ target: 'calc.result', source: 'calc.input', calculate: 'value' }],
    });
    expect(service.isCalcTriggerTargetPath('calc.result.name')).toBe(true);
  });

  test('matches an item path of an array target', () => {
    const service = makeService({
      properties: {},
      calcTriggers: [{ target: 'calc.result', source: 'calc.input', calculate: 'value' }],
    });
    expect(service.isCalcTriggerTargetPath('calc.result.2')).toBe(true);
  });

  test('matches a path under a `${index}`-templated target', () => {
    const service = makeService({
      properties: {},
      calcTriggers: [{ target: 'step1.items.${index}.result', source: 'step1.items.${index}.value', calculate: 'value' }],
    });
    expect(service.isCalcTriggerTargetPath('step1.items.2.result.name')).toBe(true);
  });

  test('does not match a parent of the target', () => {
    const service = makeService({
      properties: {},
      calcTriggers: [{ target: 'calc.result', source: 'calc.input', calculate: 'value' }],
    });
    expect(service.isCalcTriggerTargetPath('calc')).toBe(false);
  });

  test('does not match a sibling path sharing the target name as a prefix', () => {
    const service = makeService({
      properties: {},
      calcTriggers: [{ target: 'calc.result', source: 'calc.input', calculate: 'value' }],
    });
    expect(service.isCalcTriggerTargetPath('calc.resultX')).toBe(false);
  });

  test('does not match a trigger whose target is not a string', () => {
    const service = makeService({
      properties: {},
      calcTriggers: [{ target: ['calc.result'], source: 'calc.input', calculate: 'value' }],
    });
    expect(service.isCalcTriggerTargetPath('calc.result')).toBe(false);
  });

  test('matches the target of a trigger without validate: true', () => {
    const service = makeService({
      properties: {},
      calcTriggers: [{ target: 'calc.result', source: 'calc.input', calculate: 'value', validate: false }],
    });
    expect(service.isCalcTriggerTargetPath('calc.result')).toBe(true);
  });
});

describe('DocumentValidatorService.check with calcTriggers', () => {
  const makeSchema = (resultSchema: Record<string, unknown> = {}) => ({
    type: 'object',
    calcTriggers: [{ source: 'step1.input', target: 'step1.result', calculate: '(value) => value + "!"', validate: true }],
    properties: {
      step1: {
        type: 'object',
        properties: {
          input: { type: 'string', checkValid: '(value) => value !== "bad"' },
          result: { type: 'string', ...resultSchema },
        },
      },
    },
  });

  beforeEach(() => {
    global.config = {
      register: { server: 'testserver', port: 'testport', token: 'testtoken', timeout: 1000 },
    };
    new Sandbox(global.config);
    Keywords.init();
  });

  afterEach(() => {
    global.config = {};
    jest.clearAllMocks();
  });

  test('returns no calcTrigger error for an honest target', async () => {
    const service = new DocumentValidatorService(makeSchema(), {}, {});
    const errors = await service.check({ step1: { input: 'x', result: 'x!' } }, false);
    expect(errors).toEqual([]);
  });

  test('reports a tampered target as a calcTrigger mismatch', async () => {
    const service = new DocumentValidatorService(makeSchema(), {}, {});
    const errors = await service.check({ step1: { input: 'x', result: 'TAMPERED' } }, false);
    expect(errors).toEqual([
      { dataPath: 'step1.result', validationParam: undefined, message: 'calcTrigger recalculation mismatch (source: step1.input)' },
    ]);
  });

  test('lists calcTrigger errors after keyword errors', async () => {
    const service = new DocumentValidatorService(makeSchema(), {}, {});
    const errors = await service.check({ step1: { input: 'bad', result: 'TAMPERED' } }, false);
    expect(errors.map((error) => error.dataPath)).toEqual(['step1.input', 'step1.result']);
  });

  test('passes userInfo to calculate', async () => {
    const schema = makeSchema();
    schema.calcTriggers[0].calculate = '(value, step, document, parent, userInfo) => userInfo?.userId';
    const service = new DocumentValidatorService(schema, {}, { userId: 'user-1' });
    expect(await service.check({ step1: { input: 'x', result: 'user-1' } }, false)).toEqual([]);
    expect(await service.check({ step1: { input: 'x', result: 'user-2' } }, false)).toEqual([expect.objectContaining({ dataPath: 'step1.result' })]);
  });

  test('keeps a calcTrigger error of a cleanWhenHidden target with checkHidden: true', async () => {
    const service = new DocumentValidatorService(makeSchema({ cleanWhenHidden: true, checkHidden: true }), {}, {});
    const errors = await service.check({ step1: { input: 'x', result: 'TAMPERED' } }, false);
    expect(errors).toEqual([
      expect.objectContaining({ dataPath: 'step1.result', message: 'calcTrigger recalculation mismatch (source: step1.input)' }),
    ]);
  });

  test('keeps a calcTrigger error of a target with hidden: true', async () => {
    const service = new DocumentValidatorService(makeSchema({ hidden: true }), {}, {});
    const errors = await service.check({ step1: { input: 'x', result: 'TAMPERED' } }, false);
    expect(errors).toEqual([expect.objectContaining({ dataPath: 'step1.result' })]);
  });
});
