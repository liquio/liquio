import * as crypto from 'node:crypto';

import { Sandbox } from '@liquio/back-core';

import { CalcTriggersValidator } from './calc_triggers_validator';

// Suppress missing log references in validation keywords
global.log = { save: jest.fn() } as any;

describe('CalcTriggersValidator.check', () => {
  const makeValidator = (schema) => {
    new Sandbox(global.config);
    return new CalcTriggersValidator(schema, {});
  };

  const baseSchema = (): any => ({
    calcTriggers: [
      {
        source: 'step1.fieldA',
        target: 'step1.fieldB',
        calculate: '(value) => value ? value.toUpperCase() : value',
        readOnly: true,
        validate: true,
      },
    ],
    properties: {
      step1: {
        properties: {
          fieldA: { type: 'string' },
          fieldB: { type: 'string', readOnly: true },
        },
      },
    },
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

  test('returns no error when stored target value matches recomputed value', async () => {
    const validator = makeValidator(baseSchema());
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'ABC' } });
    expect(errors).toEqual([]);
  });

  test('returns a mismatch error when stored target value was tampered with', async () => {
    const validator = makeValidator(baseSchema());
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPath: 'step1.fieldB', message: 'calcTrigger recalculation mismatch (source: step1.fieldA)' }),
      ]),
    );
  });

  test('checks the trigger when targetPaths includes its target', async () => {
    const validator = makeValidator(baseSchema());
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } }, ['step1.fieldB']);
    expect(errors).toEqual(expect.arrayContaining([expect.objectContaining({ dataPath: 'step1.fieldB' })]));
  });

  test('skips the trigger entirely when targetPaths does not include its target', async () => {
    const validator = makeValidator(baseSchema());
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } }, ['step1.someOtherField']);
    expect(errors).toEqual([]);
  });

  test('matches targetPaths against a `${index}`-templated target', async () => {
    const schema = {
      calcTriggers: [
        {
          source: 'step1.items.${index}.value',
          target: 'step1.items.${index}.result',
          calculate: '(value) => value',
          validate: true,
        },
      ],
      properties: { step1: { properties: { items: { type: 'array' } } } },
    };
    const validator = makeValidator(schema);
    const objectToCheck = { step1: { items: [{ value: 'a', result: 'WRONG' }] } };

    const scopedErrors = await validator.check(objectToCheck, ['step1.items.0.result']);
    expect(scopedErrors).toEqual(expect.arrayContaining([expect.objectContaining({ dataPath: 'step1.items.0.result' })]));

    const unrelatedErrors = await validator.check(objectToCheck, ['step1.unrelated']);
    expect(unrelatedErrors).toEqual([]);
  });

  test('skips the trigger when the source field is hidden', async () => {
    const schema = baseSchema();
    schema.properties.step1.properties.fieldA.hidden = true;
    const validator = makeValidator(schema);
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } });
    expect(errors).toEqual([]);
  });

  test('skips the trigger when the source step is hidden', async () => {
    const schema = baseSchema();
    schema.properties.step1.checkStepHidden = true;
    const validator = makeValidator(schema);
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } });
    expect(errors).toEqual([]);
  });

  test('skips the trigger when the source step has no checkStepHidden but is excluded from stepOrders', async () => {
    const schema = baseSchema();
    schema.stepOrders = ['step2', 'step3'];
    const validator = makeValidator(schema);
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } });
    expect(errors).toEqual([]);
  });

  test('checks the trigger when the source step has no checkStepHidden but is listed in stepOrders', async () => {
    const schema = baseSchema();
    schema.stepOrders = ['step1', 'step2', 'step3'];
    const validator = makeValidator(schema);
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPath: 'step1.fieldB', message: 'calcTrigger recalculation mismatch (source: step1.fieldA)' }),
      ]),
    );
  });

  test('skips the trigger when the source field is checkHidden', async () => {
    const schema = baseSchema();
    schema.properties.step1.properties.fieldA.checkHidden = '() => true';
    const validator = makeValidator(schema);
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } });
    expect(errors).toEqual([]);
  });

  test('checks source triggers even when readOnly is not set', async () => {
    const schema = baseSchema();
    schema.calcTriggers[0].readOnly = false;
    const validator = makeValidator(schema);
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPath: 'step1.fieldB', message: 'calcTrigger recalculation mismatch (source: step1.fieldA)' }),
      ]),
    );
  });

  test('skips triggers missing target or calculate', async () => {
    const schema = baseSchema();
    delete schema.calcTriggers[0].target;
    const validator = makeValidator(schema);
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } });
    expect(errors).toEqual([]);
  });

  test('skips action-type triggers regardless of readOnly/source', async () => {
    const schema = baseSchema();
    schema.calcTriggers[0].action = '(async ({ value }) => value)';
    const validator = makeValidator(schema);
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } });
    expect(errors).toEqual([]);
  });

  test('skips the trigger when validate is not set', async () => {
    const schema = baseSchema();
    delete schema.calcTriggers[0].validate;
    const validator = makeValidator(schema);
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } });
    expect(errors).toEqual([]);
  });

  test('skips the trigger when validate is explicitly false', async () => {
    const schema = baseSchema();
    schema.calcTriggers[0].validate = false;
    const validator = makeValidator(schema);
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } });
    expect(errors).toEqual([]);
  });

  test('compares hashed value when useSha256 is set', async () => {
    const schema = baseSchema();
    schema.calcTriggers[0].useSha256 = true;
    const expectedHash = crypto.createHash('sha256').update('ABC').digest('hex');

    const validator = makeValidator(schema);
    const matchingErrors = await validator.check({ step1: { fieldA: 'abc', fieldB: expectedHash } });
    expect(matchingErrors).toEqual([]);

    const mismatchErrors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'ABC' } });
    expect(mismatchErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPath: 'step1.fieldB', message: 'calcTrigger recalculation mismatch (source: step1.fieldA)' }),
      ]),
    );
  });

  const indexedSchema = (): any => ({
    calcTriggers: [
      {
        source: 'step1.items.${index}.value',
        target: 'step1.items.${index}.result',
        calculate: '(value) => value ? value.toUpperCase() : value',
        validate: true,
      },
    ],
    properties: {
      step1: {
        properties: {
          items: {
            type: 'array',
            items: { properties: { value: { type: 'string' }, result: { type: 'string' } } },
          },
        },
      },
    },
  });

  test('checks a `${index}`-templated trigger for every array item', async () => {
    const validator = makeValidator(indexedSchema());
    const errors = await validator.check({
      step1: {
        items: [
          { value: 'abc', result: 'ABC' },
          { value: 'def', result: 'TAMPERED' },
        ],
      },
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPath: 'step1.items.1.result', message: 'calcTrigger recalculation mismatch (source: step1.items.1.value)' }),
      ]),
    );
    expect(errors).toHaveLength(1);
  });

  test('does not check a `${index}`-templated trigger when the referenced array is missing', async () => {
    const validator = makeValidator(indexedSchema());
    const errors = await validator.check({ step1: {} });
    expect(errors).toEqual([]);
  });

  test('skips a `${index}`-templated trigger when its source step has no checkStepHidden but is excluded from stepOrders', async () => {
    const schema = indexedSchema();
    schema.stepOrders = ['step2', 'step3'];
    const validator = makeValidator(schema);
    const errors = await validator.check({
      step1: { items: [{ value: 'abc', result: 'TAMPERED' }] },
    });
    expect(errors).toEqual([]);
  });

  const callBeforePdfSchema = (callBeforePdf: boolean | string = true): any => ({
    pdfRequired: true,
    calcTriggers: [
      {
        target: 'calculated.result',
        calculate: '(value, step, documentData) => documentData.step1.fieldA',
        callBeforePdf,
        validate: true,
      },
    ],
    properties: {
      calculated: { checkStepHidden: true, properties: { result: { type: 'string' } } },
      step1: { properties: { fieldA: { type: 'string' } } },
    },
  });

  test('checks callBeforePdf trigger when PDF is required', async () => {
    const validator = makeValidator(callBeforePdfSchema());
    const errors = await validator.check({ step1: { fieldA: 'abc' }, calculated: { result: 'TAMPERED' } });
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ dataPath: 'calculated.result', message: 'calcTrigger recalculation mismatch' })]),
    );
  });

  test('returns no error for callBeforePdf trigger when recomputed value matches', async () => {
    const validator = makeValidator(callBeforePdfSchema());
    const errors = await validator.check({ step1: { fieldA: 'abc' }, calculated: { result: 'abc' } });
    expect(errors).toEqual([]);
  });

  test('skips callBeforePdf trigger when PDF is not required', async () => {
    const schema = callBeforePdfSchema();
    schema.pdfRequired = false;
    const validator = makeValidator(schema);
    const errors = await validator.check({ step1: { fieldA: 'abc' }, calculated: { result: 'TAMPERED' } });
    expect(errors).toEqual([]);
  });

  test('skips callBeforePdf trigger when its own condition evaluates to false', async () => {
    const schema = callBeforePdfSchema('(documentData) => false');
    const validator = makeValidator(schema);
    const errors = await validator.check({ step1: { fieldA: 'abc' }, calculated: { result: 'TAMPERED' } });
    expect(errors).toEqual([]);
  });

  test('checks callBeforePdf trigger when its function condition evaluates to true', async () => {
    const schema = callBeforePdfSchema('(documentData) => true');
    const validator = makeValidator(schema);
    const errors = await validator.check({ step1: { fieldA: 'abc' }, calculated: { result: 'TAMPERED' } });
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ dataPath: 'calculated.result', message: 'calcTrigger recalculation mismatch' })]),
    );
  });

  const silentSchema = (): any => ({
    calcTriggers: [
      {
        target: 'calculated.result',
        calculate: '(value, step, documentData) => documentData.step1.fieldA',
        validate: true,
      },
    ],
    properties: {
      calculated: { checkStepHidden: true, properties: { result: { type: 'string' } } },
      step1: { properties: { fieldA: { type: 'string' } } },
      step2: { properties: { fieldA: { type: 'string' } } },
      step3: { properties: { fieldA: { type: 'string' } } }, // Last step - excluded from the visible-steps count.
    },
  });

  test('checks silent trigger when more than one non-last step is visible', async () => {
    const validator = makeValidator(silentSchema());
    const errors = await validator.check({
      step1: { fieldA: 'abc' },
      step2: {},
      step3: {},
      calculated: { result: 'TAMPERED' },
    });
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ dataPath: 'calculated.result', message: 'calcTrigger recalculation mismatch' })]),
    );
  });

  test('checks silent trigger when exactly one non-last step is visible', async () => {
    const schema = silentSchema();
    schema.properties.step2.checkStepHidden = true;
    const validator = makeValidator(schema);
    const errors = await validator.check({
      step1: { fieldA: 'abc' },
      step2: {},
      step3: {},
      calculated: { result: 'TAMPERED' },
    });
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ dataPath: 'calculated.result', message: 'calcTrigger recalculation mismatch' })]),
    );
  });

  test('skips silent trigger when only one step total is visible', async () => {
    const schema = silentSchema();
    schema.properties.step2.checkStepHidden = true;
    schema.properties.step3.checkStepHidden = true;
    const validator = makeValidator(schema);
    const errors = await validator.check({
      step1: { fieldA: 'abc' },
      step2: {},
      step3: {},
      calculated: { result: 'TAMPERED' },
    });
    expect(errors).toEqual([]);
  });

  test('excludes the last *visible* step, not the last defined one, when the last defined step is conditionally hidden', async () => {
    const schema = silentSchema();
    // step2 is always hidden here, so the only real contenders are step1 and (conditionally) step3.
    schema.properties.step2.checkStepHidden = true;
    // step3 is defined last but is conditionally hidden - when hidden, step1 is the sole visible
    // step and must itself be excluded as "last", not wrongly kept as a non-last enforceable one.
    schema.properties.step3.checkStepHidden = '(documentData) => documentData?.step3?.hidden === true';
    const validator = makeValidator(schema);

    // step3 hidden -> only step1 visible -> excluding it (the real last) leaves nothing -> skipped,
    // even though step1 would wrongly count as "non-last" if step3 were excluded structurally
    // instead of dynamically (step3 isn't even in the visible list to remove).
    const skippedErrors = await validator.check({
      step1: { fieldA: 'abc' },
      step2: {},
      step3: { hidden: true },
      calculated: { result: 'TAMPERED' },
    });
    expect(skippedErrors).toEqual([]);

    // step3 shown -> step1/step3 visible -> excluding step3 (real last) leaves step1 -> checked.
    const checkedErrors = await validator.check({
      step1: { fieldA: 'abc' },
      step2: {},
      step3: { hidden: false },
      calculated: { result: 'TAMPERED' },
    });
    expect(checkedErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ dataPath: 'calculated.result', message: 'calcTrigger recalculation mismatch' })]),
    );
  });

  test('checks step-only trigger when its step is not hidden', async () => {
    const schema = silentSchema();
    schema.calcTriggers[0].step = 'step1';
    const validator = makeValidator(schema);
    const errors = await validator.check({
      step1: { fieldA: 'abc' },
      step2: {},
      step3: {},
      calculated: { result: 'TAMPERED' },
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPath: 'calculated.result', message: 'calcTrigger recalculation mismatch (step: step1)' }),
      ]),
    );
  });

  test('skips step-only trigger when its step is hidden and not listed in stepOrders', async () => {
    const schema = silentSchema();
    schema.calcTriggers[0].step = 'step1';
    schema.properties.step1.checkStepHidden = true;
    const validator = makeValidator(schema);
    const errors = await validator.check({
      step1: { fieldA: 'abc' },
      step2: {},
      step3: {},
      calculated: { result: 'TAMPERED' },
    });
    expect(errors).toEqual([]);
  });

  test('checks step-only trigger when its step is hidden but listed in stepOrders', async () => {
    const schema = silentSchema();
    schema.calcTriggers[0].step = 'step1';
    schema.properties.step1.checkStepHidden = true;
    schema.stepOrders = ['step1', 'step2', 'step3'];
    const validator = makeValidator(schema);
    const errors = await validator.check({
      step1: { fieldA: 'abc' },
      step2: {},
      step3: {},
      calculated: { result: 'TAMPERED' },
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPath: 'calculated.result', message: 'calcTrigger recalculation mismatch (step: step1)' }),
      ]),
    );
  });

  test('resolves stepOrders when defined as a function', async () => {
    const schema = silentSchema();
    schema.calcTriggers[0].step = 'step1';
    schema.properties.step1.checkStepHidden = true;
    schema.stepOrders = "() => ['step1', 'step2', 'step3']";
    const validator = makeValidator(schema);
    const errors = await validator.check({
      step1: { fieldA: 'abc' },
      step2: {},
      step3: {},
      calculated: { result: 'TAMPERED' },
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPath: 'calculated.result', message: 'calcTrigger recalculation mismatch (step: step1)' }),
      ]),
    );
  });

  test('does not default a step with no checkStepHidden to shown when stepOrders is defined and excludes it', async () => {
    const schema = silentSchema();
    schema.calcTriggers[0].step = 'step1'; // step1 has no checkStepHidden of its own.
    schema.stepOrders = ['step2', 'step3'];
    const validator = makeValidator(schema);
    const errors = await validator.check({
      step1: { fieldA: 'abc' },
      step2: {},
      step3: {},
      calculated: { result: 'TAMPERED' },
    });
    expect(errors).toEqual([]);
  });

  test('checks step-only trigger when its own checkStepHidden is false even if stepOrders excludes it', async () => {
    const schema = silentSchema();
    schema.calcTriggers[0].step = 'step1';
    schema.properties.step1.checkStepHidden = false; // Explicitly "not hidden" on its own - takes priority.
    schema.stepOrders = ['step2', 'step3']; // stepOrders excludes it, but checkStepHidden: false wins.
    const validator = makeValidator(schema);
    const errors = await validator.check({
      step1: { fieldA: 'abc' },
      step2: {},
      step3: {},
      calculated: { result: 'TAMPERED' },
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataPath: 'calculated.result', message: 'calcTrigger recalculation mismatch (step: step1)' }),
      ]),
    );
  });

  test('silent trigger counts steps via stepOrders when no step defines checkStepHidden', async () => {
    // A `calculated`-like sink step with no checkStepHidden, absent from stepOrders, must not be
    // counted as visible just because it lacks checkStepHidden.
    const schema = {
      calcTriggers: [{ target: 'calculated.result', calculate: '(value, step, documentData) => documentData.step1.fieldA', validate: true }],
      stepOrders: ['step1', 'step2', 'step3'],
      properties: {
        calculated: { properties: { result: { type: 'string' } } },
        step1: { properties: { fieldA: { type: 'string' } } },
        step2: { properties: { fieldA: { type: 'string' } } },
        step3: { properties: { fieldA: { type: 'string' } } },
      },
    };
    const validator = makeValidator(schema);

    const errors = await validator.check({
      step1: { fieldA: 'abc' },
      step2: {},
      step3: {},
      calculated: { result: 'TAMPERED' },
    });
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ dataPath: 'calculated.result', message: 'calcTrigger recalculation mismatch' })]),
    );
  });

  test('silent trigger is skipped when stepOrders excludes everything but the sink step', async () => {
    const schema = {
      calcTriggers: [{ target: 'calculated.result', calculate: '(value, step, documentData) => documentData.step1.fieldA', validate: true }],
      stepOrders: ['step1'],
      properties: {
        calculated: { properties: { result: { type: 'string' } } },
        step1: { properties: { fieldA: { type: 'string' } } },
        step2: { properties: { fieldA: { type: 'string' } } },
      },
    };
    const validator = makeValidator(schema);

    const errors = await validator.check({
      step1: { fieldA: 'abc' },
      step2: {},
      calculated: { result: 'TAMPERED' },
    });
    expect(errors).toEqual([]);
  });
});

describe('CalcTriggersValidator.check with targetPaths under the target', () => {
  const objectTargetSchema = () => ({
    calcTriggers: [
      {
        source: 'step1.fieldA',
        target: 'step1.result',
        calculate: '(value) => ({ name: value, len: value.length })',
        readOnly: true,
        validate: true,
      },
    ],
    properties: {
      step1: {
        properties: {
          fieldA: { type: 'string' },
          result: { type: 'object', readOnly: true, properties: { name: { type: 'string' }, len: { type: 'number' } } },
        },
      },
    },
  });

  beforeEach(() => {
    global.config = { register: { server: 'testserver', port: 'testport', token: 'testtoken', timeout: 1000 } };
    new Sandbox(global.config);
  });

  afterEach(() => {
    global.config = {};
    jest.clearAllMocks();
  });

  test('checks the trigger when targetPaths has a leaf sub-path of an object target', async () => {
    const validator = new CalcTriggersValidator(objectTargetSchema(), {});
    const errors = await validator.check({ step1: { fieldA: 'abc', result: { name: 'abc', len: 99 } } }, ['step1.result.len']);
    expect(errors).toEqual([
      expect.objectContaining({ dataPath: 'step1.result', message: 'calcTrigger recalculation mismatch (source: step1.fieldA)' }),
    ]);
  });

  test('returns no error for an honest object target checked through a leaf sub-path', async () => {
    const validator = new CalcTriggersValidator(objectTargetSchema(), {});
    const errors = await validator.check({ step1: { fieldA: 'abc', result: { name: 'abc', len: 3 } } }, ['step1.result.name']);
    expect(errors).toEqual([]);
  });

  test('checks the trigger when targetPaths has an item path of an array target', async () => {
    const schema = objectTargetSchema();
    schema.calcTriggers[0].calculate = '(value) => [value, value]';
    const validator = new CalcTriggersValidator(schema, {});
    const errors = await validator.check({ step1: { fieldA: 'abc', result: ['abc', 'TAMPERED'] } }, ['step1.result.1']);
    expect(errors).toEqual([expect.objectContaining({ dataPath: 'step1.result' })]);
  });

  test('skips the trigger when targetPaths only has a parent of the target', async () => {
    const validator = new CalcTriggersValidator(objectTargetSchema(), {});
    const errors = await validator.check({ step1: { fieldA: 'abc', result: { name: 'TAMPERED' } } }, ['step1']);
    expect(errors).toEqual([]);
  });

  test('skips the trigger when targetPaths only has a sibling path sharing the target name as a prefix', async () => {
    const validator = new CalcTriggersValidator(objectTargetSchema(), {});
    const errors = await validator.check({ step1: { fieldA: 'abc', result: { name: 'TAMPERED' } } }, ['step1.resultX']);
    expect(errors).toEqual([]);
  });

  test('checks a `${index}`-templated trigger when targetPaths has a path under the concrete target', async () => {
    const schema = {
      calcTriggers: [
        { source: 'step1.items.${index}.value', target: 'step1.items.${index}.result', calculate: '(value) => ({ v: value })', validate: true },
      ],
      properties: { step1: { properties: { items: { type: 'array' } } } },
    };
    const validator = new CalcTriggersValidator(schema, {});
    const errors = await validator.check({ step1: { items: [{ value: 'a', result: { v: 'WRONG' } }] } }, ['step1.items.0.result.v']);
    expect(errors).toEqual([expect.objectContaining({ dataPath: 'step1.items.0.result' })]);
  });
});

describe('CalcTriggersValidator mismatch log', () => {
  const MISMATCH_LOG_TYPE = 'calc-triggers-validation-mismatch';

  const mismatchLogCalls = () => (global.log.save as jest.Mock).mock.calls.filter(([type]) => type === MISMATCH_LOG_TYPE);

  beforeEach(() => {
    global.config = { register: { server: 'testserver', port: 'testport', token: 'testtoken', timeout: 1000 } };
    new Sandbox(global.config);
  });

  afterEach(() => {
    global.config = {};
    jest.clearAllMocks();
  });

  test('logs a source trigger mismatch with its target and source, as a warning', async () => {
    const schema = {
      calcTriggers: [{ source: 'step1.fieldA', target: 'step1.fieldB', calculate: '(value) => value', validate: true }],
      properties: { step1: { properties: { fieldA: { type: 'string' }, fieldB: { type: 'string' } } } },
    };
    const validator = new CalcTriggersValidator(schema, {});
    await validator.check({ step1: { fieldA: 'SECRET-SOURCE', fieldB: 'SECRET-TAMPERED' } });

    expect(mismatchLogCalls()).toEqual([[MISMATCH_LOG_TYPE, { target: 'step1.fieldB', source: 'step1.fieldA' }, 'warn']]);
  });

  test('never logs the stored or the recalculated value', async () => {
    const schema = {
      calcTriggers: [{ source: 'step1.fieldA', target: 'step1.fieldB', calculate: '(value) => value + "-EXPECTED"', validate: true }],
      properties: { step1: { properties: { fieldA: { type: 'string' }, fieldB: { type: 'string' } } } },
    };
    const validator = new CalcTriggersValidator(schema, {});
    await validator.check({ step1: { fieldA: 'SECRET-SOURCE', fieldB: 'SECRET-TAMPERED' } });

    const logged = JSON.stringify((global.log.save as jest.Mock).mock.calls);
    expect(mismatchLogCalls()).toHaveLength(1);
    expect(logged).not.toContain('SECRET-SOURCE');
    expect(logged).not.toContain('SECRET-TAMPERED');
    expect(logged).not.toContain('EXPECTED');
  });

  test('logs a step trigger mismatch with its target and step', async () => {
    const schema = {
      calcTriggers: [{ step: 'step1', target: 'calculated.result', calculate: '() => "ok"', validate: true }],
      properties: { step1: { properties: {} }, calculated: { properties: { result: { type: 'string' } } } },
    };
    const validator = new CalcTriggersValidator(schema, {});
    await validator.check({ step1: {}, calculated: { result: 'TAMPERED' } });

    expect(mismatchLogCalls()).toEqual([[MISMATCH_LOG_TYPE, { target: 'calculated.result', step: 'step1' }, 'warn']]);
  });

  test('logs a callBeforePdf trigger mismatch with its target and callBeforePdf attribute', async () => {
    const schema = {
      pdfRequired: true,
      calcTriggers: [{ callBeforePdf: true, target: 'calculated.result', calculate: '() => "ok"', validate: true }],
      properties: { calculated: { properties: { result: { type: 'string' } } } },
    };
    const validator = new CalcTriggersValidator(schema, {});
    await validator.check({ calculated: { result: 'TAMPERED' } });

    expect(mismatchLogCalls()).toEqual([[MISMATCH_LOG_TYPE, { target: 'calculated.result', callBeforePdf: true }, 'warn']]);
  });

  test('logs the concrete target of a `${index}`-templated trigger', async () => {
    const schema = {
      calcTriggers: [{ source: 'step1.items.${index}.value', target: 'step1.items.${index}.result', calculate: '(value) => value', validate: true }],
      properties: { step1: { properties: { items: { type: 'array' } } } },
    };
    const validator = new CalcTriggersValidator(schema, {});
    await validator.check({
      step1: {
        items: [
          { value: 'a', result: 'a' },
          { value: 'b', result: 'TAMPERED' },
        ],
      },
    });

    expect(mismatchLogCalls()).toEqual([[MISMATCH_LOG_TYPE, { target: 'step1.items.1.result', source: 'step1.items.1.value' }, 'warn']]);
  });

  test('does not log when the stored value matches', async () => {
    const schema = {
      calcTriggers: [{ source: 'step1.fieldA', target: 'step1.fieldB', calculate: '(value) => value', validate: true }],
      properties: { step1: { properties: { fieldA: { type: 'string' }, fieldB: { type: 'string' } } } },
    };
    const validator = new CalcTriggersValidator(schema, {});
    await validator.check({ step1: { fieldA: 'abc', fieldB: 'abc' } });

    expect(mismatchLogCalls()).toEqual([]);
  });

  test('logs a failing calculate as an exception, not as a mismatch', async () => {
    const schema = {
      calcTriggers: [{ source: 'step1.fieldA', target: 'step1.fieldB', calculate: '(value) => value.missing.deep', validate: true }],
      properties: { step1: { properties: { fieldA: { type: 'string' }, fieldB: { type: 'string' } } } },
    };
    const validator = new CalcTriggersValidator(schema, {});
    const errors = await validator.check({ step1: { fieldA: 'abc', fieldB: 'TAMPERED' } });

    expect(errors).toEqual([]);
    expect(mismatchLogCalls()).toEqual([]);
    expect(global.log.save).toHaveBeenCalledWith(
      'json-schema-validation-exception|check-calc-triggers',
      expect.objectContaining({ target: 'step1.fieldB' }),
      'warn',
    );
  });
});
