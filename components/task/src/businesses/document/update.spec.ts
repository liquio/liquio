import { Sandbox } from '@liquio/back-core';

import { DocumentBusiness } from './index';
import { DocumentValidatorService } from '../../services/document_validator';

// Wrap the real validator so constructor arguments can be asserted while its behaviour stays real.
jest.mock('../../services/document_validator', () => {
  const actual = jest.requireActual('../../services/document_validator');
  return {
    ...actual,
    DocumentValidatorService: jest.fn().mockImplementation((...args) => new actual.DocumentValidatorService(...args)),
  };
});

global.log = { save: jest.fn() } as any;

describe('DocumentBusiness.update', () => {
  const jsonSchema = {
    properties: {
      step1: {
        properties: {
          fieldA: { type: 'string' },
          fieldB: { type: 'string', readOnly: true },
          initData: { type: 'string' },
        },
      },
    },
  };

  let documentBusiness: DocumentBusiness;
  let document: any;
  let updateData: jest.Mock;

  beforeEach(() => {
    global.config = { register: { server: 'testserver', port: 'testport', token: 'testtoken', timeout: 1000 } };
    new Sandbox(global.config);

    // Bypass the singleton constructor: `update` only needs the sandbox and its own helper methods.
    documentBusiness = Object.create(DocumentBusiness.prototype);
    documentBusiness.sandbox = Sandbox.getInstance();

    document = {
      id: 'document-id',
      documentTemplateId: 1,
      isFinal: false,
      data: { step1: { fieldA: 'a', fieldB: 'b' } },
      task: { id: 'task-id', taskTemplate: { jsonSchema: {} } },
    };
    jest.spyOn(documentBusiness, 'findByIdAndCheckAccess').mockResolvedValue(document);

    updateData = jest.fn().mockImplementation(async (id, _userId, data) => ({ id, data }));
    global.models = {
      documentSignature: { getByDocumentId: jest.fn().mockResolvedValue([]) },
      documentTemplate: { findById: jest.fn().mockResolvedValue({ jsonSchema }) },
      document: { updateData },
    } as any;
    global.businesses = {
      task: { calculateAndUpdateDraftExpiredAt: jest.fn().mockResolvedValue(undefined) },
    } as any;

    (DocumentValidatorService as unknown as jest.Mock).mockClear();
  });

  afterEach(() => {
    global.config = {};
    jest.restoreAllMocks();
  });

  it('passes userInfo to the document validator', async () => {
    const userInfo = { userId: 'user-id', ipn: '1234567890' };
    await documentBusiness.update(
      'document-id',
      [{ path: 'step1.fieldA', value: 'A' }],
      'user-id',
      { all: [], head: [], member: [] } as any,
      userInfo,
    );
    expect(DocumentValidatorService).toHaveBeenCalledTimes(1);
    expect(DocumentValidatorService).toHaveBeenCalledWith(jsonSchema, undefined, userInfo);
  });

  it('passes undefined userInfo to the document validator when it is omitted', async () => {
    await documentBusiness.update('document-id', [{ path: 'step1.fieldA', value: 'A' }], 'user-id', { all: [], head: [], member: [] } as any);
    expect(DocumentValidatorService).toHaveBeenCalledWith(jsonSchema, undefined, undefined);
  });

  it('writes a deep copy of the document data and leaves the loaded document data untouched', async () => {
    const originalData = document.data;
    const originalStep = document.data.step1;

    await documentBusiness.update('document-id', [{ path: 'step1.fieldA', value: 'A' }], 'user-id', { all: [], head: [], member: [] } as any);

    const [, , writtenData] = updateData.mock.calls[0];
    expect(writtenData).toEqual({ step1: { fieldA: 'A', fieldB: 'b' } });
    expect(writtenData).not.toBe(originalData);
    expect(writtenData.step1).not.toBe(originalStep);
    expect(document.data).toBe(originalData);
    expect(document.data).toEqual({ step1: { fieldA: 'a', fieldB: 'b' } });
  });

  it('keeps a readOnly field out of the written data', async () => {
    await documentBusiness.update('document-id', [{ path: 'step1.fieldB', value: 'X' }], 'user-id', { all: [], head: [], member: [] } as any);
    const [, , writtenData] = updateData.mock.calls[0];
    expect(writtenData).toEqual({ step1: { fieldA: 'a', fieldB: 'b' } });
  });

  it('drops initData paths unless isFromSystemTask is set', async () => {
    await documentBusiness.update('document-id', [{ path: 'step1.initData', value: 'I' }], 'user-id', { all: [], head: [], member: [] } as any);
    const [, , writtenData] = updateData.mock.calls[0];
    expect(writtenData.step1.initData).toBeUndefined();
  });

  it('writes initData paths when isFromSystemTask is set in the options object', async () => {
    await documentBusiness.update(
      'document-id',
      [{ path: 'step1.initData', value: 'I' }],
      'user-id',
      { all: [], head: [], member: [] } as any,
      undefined,
      {
        isFromSystemTask: true,
      },
    );
    const [, , writtenData] = updateData.mock.calls[0];
    expect(writtenData.step1.initData).toBe('I');
  });

  it('forwards isKeepDocumentFile from the options object to updateData', async () => {
    await documentBusiness.update(
      'document-id',
      [{ path: 'step1.fieldA', value: 'A' }],
      'user-id',
      { all: [], head: [], member: [] } as any,
      undefined,
      {
        isKeepDocumentFile: true,
      },
    );
    expect(updateData).toHaveBeenCalledWith('document-id', 'user-id', expect.any(Object), true, true);
  });

  it('defaults isKeepDocumentFile to false', async () => {
    await documentBusiness.update('document-id', [{ path: 'step1.fieldA', value: 'A' }], 'user-id', { all: [], head: [], member: [] } as any);
    expect(updateData).toHaveBeenCalledWith('document-id', 'user-id', expect.any(Object), true, false);
  });
});

describe('DocumentBusiness.update with calcTriggers and triggerPath', () => {
  const userUnitIds = { all: [], head: [], member: [] } as any;

  // Field `calc.result` / `calc.list` is readOnly; its trigger is recalculated on the front (trigger
  // `readOnly: true`) and checked on the server (`validate: true`).
  const makeJsonSchema = (resultSchema: Record<string, unknown>, calculate: string) => ({
    properties: {
      calc: {
        properties: {
          input: { type: 'string' },
          result: { readOnly: true, ...resultSchema },
          other: { type: 'string', readOnly: true },
        },
      },
      // A writable target, so a write to its parent object reaches it.
      s1: { properties: { t: { type: 'string' } } },
    },
    calcTriggers: [
      { source: 'calc.input', target: 'calc.result', calculate, readOnly: true, validate: true },
      { source: 'calc.input', target: 's1.t', calculate: '(value) => value', validate: true },
    ],
  });
  const scalarSchema = makeJsonSchema({ type: 'string' }, '(value) => value ? value.toUpperCase() : value');
  const objectSchema = makeJsonSchema(
    { type: 'object', properties: { name: { type: 'string' }, len: { type: 'number' } } },
    '(value) => ({ name: value, len: value.length })',
  );
  const arraySchema = makeJsonSchema({ type: 'array', items: { type: 'string' } }, '(value) => value.split("")');

  let documentBusiness: DocumentBusiness;
  let document: any;
  let updateData: jest.Mock;
  let findTemplateById: jest.Mock;

  const useSchema = (jsonSchema) => findTemplateById.mockResolvedValue({ jsonSchema });

  const update = (properties, triggerPath?: string[]) =>
    documentBusiness.update('document-id', properties, 'user-id', userUnitIds, undefined, triggerPath ? { triggerPath } : {});

  const writtenData = () => updateData.mock.calls[0][2];

  beforeEach(() => {
    global.config = { register: { server: 'testserver', port: 'testport', token: 'testtoken', timeout: 1000 } };
    new Sandbox(global.config);

    documentBusiness = Object.create(DocumentBusiness.prototype);
    documentBusiness.sandbox = Sandbox.getInstance();

    document = {
      id: 'document-id',
      documentTemplateId: 1,
      isFinal: false,
      data: { calc: {} },
      task: { id: 'task-id', taskTemplate: { jsonSchema: {} } },
    };
    jest.spyOn(documentBusiness, 'findByIdAndCheckAccess').mockResolvedValue(document);

    updateData = jest.fn().mockImplementation(async (id, _userId, data) => ({ id, data }));
    findTemplateById = jest.fn();
    global.models = {
      documentSignature: { getByDocumentId: jest.fn().mockResolvedValue([]) },
      documentTemplate: { findById: findTemplateById },
      document: { updateData },
    } as any;
    global.businesses = {
      task: { calculateAndUpdateDraftExpiredAt: jest.fn().mockResolvedValue(undefined) },
    } as any;
    (global.log.save as jest.Mock).mockClear();
  });

  afterEach(() => {
    global.config = {};
    jest.restoreAllMocks();
  });

  describe('scalar target', () => {
    it('accepts an honestly recalculated target listed in triggerPath', async () => {
      useSchema(scalarSchema);
      await update(
        [
          { path: 'calc.input', value: 'abc' },
          { path: 'calc.result', value: 'ABC' },
        ],
        ['calc.result'],
      );
      expect(writtenData()).toEqual({ calc: { input: 'abc', result: 'ABC' } });
    });

    it('rejects a tampered target listed in triggerPath as a recalculation mismatch', async () => {
      useSchema(scalarSchema);
      const promise = update(
        [
          { path: 'calc.input', value: 'abc' },
          { path: 'calc.result', value: 'TAMPERED' },
        ],
        ['calc.result'],
      );
      await expect(promise).rejects.toMatchObject({ name: 'InvalidParamsError', message: 'CalcTrigger recalculation mismatch.' });
      expect(updateData).not.toHaveBeenCalled();
    });

    it('reports the mismatching target as the error cause', async () => {
      useSchema(scalarSchema);
      const error = await update(
        [
          { path: 'calc.input', value: 'abc' },
          { path: 'calc.result', value: 'TAMPERED' },
        ],
        ['calc.result'],
      ).catch((e) => e);
      expect(error.cause).toEqual([expect.objectContaining({ dataPath: 'calc.result' })]);
    });

    it('logs the mismatch with its target and source but not the value', async () => {
      useSchema(scalarSchema);
      await update(
        [
          { path: 'calc.input', value: 'abc' },
          { path: 'calc.result', value: 'TAMPERED' },
        ],
        ['calc.result'],
      ).catch(() => undefined);
      expect(global.log.save).toHaveBeenCalledWith('calc-triggers-validation-mismatch', { target: 'calc.result', source: 'calc.input' }, 'warn');
      expect(JSON.stringify((global.log.save as jest.Mock).mock.calls)).not.toContain('TAMPERED');
    });

    it('drops a readOnly target written without triggerPath and does not check it', async () => {
      useSchema(scalarSchema);
      await update([{ path: 'calc.result', value: 'TAMPERED' }]);
      expect(writtenData()).toEqual({ calc: {} });
    });
  });

  describe('object target', () => {
    it('accepts the first fill of the whole object listed in triggerPath and stores it as sent', async () => {
      useSchema(objectSchema);
      await update(
        [
          { path: 'calc.input', value: 'abc' },
          { path: 'calc.result', value: { name: 'abc', len: 3 } },
        ],
        ['calc.result'],
      );
      expect(writtenData()).toEqual({ calc: { input: 'abc', result: { name: 'abc', len: 3 } } });
    });

    it('accepts an honest recalculation sent as leaf sub-paths listed in triggerPath', async () => {
      useSchema(objectSchema);
      document.data = { calc: { input: 'abc', result: { name: 'abc', len: 3 } } };
      await update(
        [
          { path: 'calc.input', value: 'abcd' },
          { path: 'calc.result.name', value: 'abcd' },
          { path: 'calc.result.len', value: 4 },
        ],
        ['calc.result.name', 'calc.result.len'],
      );
      expect(writtenData()).toEqual({ calc: { input: 'abcd', result: { name: 'abcd', len: 4 } } });
    });

    it('rejects a tampered recalculation sent as leaf sub-paths as a recalculation mismatch', async () => {
      useSchema(objectSchema);
      document.data = { calc: { input: 'abc', result: { name: 'abc', len: 3 } } };
      const promise = update(
        [
          { path: 'calc.input', value: 'abcd' },
          { path: 'calc.result.name', value: 'abcd' },
          { path: 'calc.result.len', value: 99 },
        ],
        ['calc.result.name', 'calc.result.len'],
      );
      await expect(promise).rejects.toMatchObject({ message: 'CalcTrigger recalculation mismatch.' });
      expect(updateData).not.toHaveBeenCalled();
    });

    it('rejects a stale object when only one leaf sub-path is recalculated', async () => {
      useSchema(objectSchema);
      document.data = { calc: { input: 'abc', result: { name: 'abc', len: 3 } } };
      const promise = update(
        [
          { path: 'calc.input', value: 'abcd' },
          { path: 'calc.result.name', value: 'abcd' },
        ],
        ['calc.result.name'],
      );
      await expect(promise).rejects.toMatchObject({ message: 'CalcTrigger recalculation mismatch.' });
    });
  });

  describe('array target', () => {
    it('accepts the first fill of the whole array listed in triggerPath', async () => {
      useSchema(arraySchema);
      await update(
        [
          { path: 'calc.input', value: 'ab' },
          { path: 'calc.result', value: ['a', 'b'] },
        ],
        ['calc.result'],
      );
      expect(writtenData()).toEqual({ calc: { input: 'ab', result: ['a', 'b'] } });
    });

    it('accepts an honest recalculation sent as an item path listed in triggerPath', async () => {
      useSchema(arraySchema);
      document.data = { calc: { input: 'ab', result: ['a', 'b'] } };
      await update(
        [
          { path: 'calc.input', value: 'abc' },
          { path: 'calc.result.2', value: 'c' },
        ],
        ['calc.result.2'],
      );
      expect(writtenData()).toEqual({ calc: { input: 'abc', result: ['a', 'b', 'c'] } });
    });

    it('rejects a tampered item path listed in triggerPath as a recalculation mismatch', async () => {
      useSchema(arraySchema);
      document.data = { calc: { input: 'ab', result: ['a', 'b'] } };
      const promise = update(
        [
          { path: 'calc.input', value: 'abc' },
          { path: 'calc.result.2', value: 'TAMPERED' },
        ],
        ['calc.result.2'],
      );
      await expect(promise).rejects.toMatchObject({ message: 'CalcTrigger recalculation mismatch.' });
    });
  });

  describe('invalid triggerPath', () => {
    it('rejects a triggerPath naming a readOnly field that is not a calcTrigger target', async () => {
      useSchema(scalarSchema);
      const promise = update([{ path: 'calc.other', value: 'X' }], ['calc.other']);
      await expect(promise).rejects.toMatchObject({ name: 'InvalidParamsError', message: 'Invalid trigger path.', cause: ['calc.other'] });
      expect(updateData).not.toHaveBeenCalled();
    });

    it('rejects a triggerPath naming a sibling that shares the target name as a prefix', async () => {
      useSchema(scalarSchema);
      await expect(update([{ path: 'calc.resultX', value: 'X' }], ['calc.resultX'])).rejects.toMatchObject({ message: 'Invalid trigger path.' });
    });

    it('rejects a triggerPath naming a parent of a target', async () => {
      useSchema(scalarSchema);
      await expect(update([{ path: 'calc', value: { result: 'X' } }], ['calc'])).rejects.toMatchObject({ message: 'Invalid trigger path.' });
    });
  });

  describe('written paths scope', () => {
    it('does not check a target inside a written parent object on PUT', async () => {
      useSchema(scalarSchema);
      document.data = { calc: {}, s1: {} };
      await update([
        { path: 'calc.input', value: 'abc' },
        { path: 's1', value: { t: 'TAMPERED' } },
      ]);
      expect(writtenData().s1).toEqual({ t: 'TAMPERED' });
    });

    it('checks a writable target written directly without triggerPath', async () => {
      useSchema(scalarSchema);
      document.data = { calc: { input: 'abc' }, s1: {} };
      await expect(update([{ path: 's1.t', value: 'TAMPERED' }])).rejects.toMatchObject({ message: 'CalcTrigger recalculation mismatch.' });
    });

    it('does not check targets when only their source is written', async () => {
      useSchema(scalarSchema);
      document.data = { calc: { input: 'abc', result: 'ABC' }, s1: { t: 'abc' } };
      await update([{ path: 'calc.input', value: 'xyz' }]);
      expect(writtenData()).toEqual({ calc: { input: 'xyz', result: 'ABC' }, s1: { t: 'abc' } });
    });
  });
});
