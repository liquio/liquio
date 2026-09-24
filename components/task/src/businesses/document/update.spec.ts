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
