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
