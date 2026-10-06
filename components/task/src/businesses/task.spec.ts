import { Sandbox } from '@liquio/back-core';

import { TaskBusiness } from './task';
import { DocumentValidatorService } from '../services/document_validator';

jest.mock('../services/document_validator', () => ({
  DocumentValidatorService: jest.fn(),
}));

global.log = { save: jest.fn() } as any;

describe('TaskBusiness.setStatusFinished', () => {
  const jsonSchema = { properties: { step1: { properties: { fieldA: { type: 'string' } } } } };
  const validationErrors = [{ dataPath: 'step1.fieldA', message: 'checkValid error.' }];

  let taskBusiness: TaskBusiness;
  let check: jest.Mock;

  beforeEach(() => {
    new Sandbox();

    // Bypass the singleton constructor: the part of `setStatusFinished` under test only needs the sandbox.
    taskBusiness = Object.create(TaskBusiness.prototype);
    taskBusiness.sandbox = Sandbox.getInstance();
    jest.spyOn(taskBusiness, 'isCommitAvailable').mockResolvedValue(true);

    check = jest.fn().mockResolvedValue(validationErrors);
    (DocumentValidatorService as unknown as jest.Mock).mockReset().mockImplementation(() => ({ check }));

    const task = {
      id: 'task-id',
      workflowId: 'workflow-id',
      taskTemplateId: 2,
      isEntry: false,
      finished: false,
      signerUsers: [],
      meta: {},
      hasAccess: jest.fn().mockResolvedValue(true),
      document: { id: 'document-id', documentTemplateId: 1, data: { step1: { fieldA: 'a' } } },
    };
    global.models = {
      task: {
        findById: jest.fn().mockResolvedValue(task),
        getTraceMetaByTaskId: jest.fn().mockResolvedValue({ taskId: 'task-id', workflowTemplateId: 3 }),
      },
      workflow: { findById: jest.fn().mockResolvedValue({ workflowTemplate: { data: {} } }) },
      taskTemplate: { findById: jest.fn().mockResolvedValue({ jsonSchema: {} }) },
      documentTemplate: { findById: jest.fn().mockResolvedValue({ jsonSchema }) },
      workflowError: { create: jest.fn().mockResolvedValue(undefined) },
    } as any;
    global.businesses = {
      register: { getFilteredRecordsByKeyId: jest.fn() },
    } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes the committing user to the document validator', async () => {
    const user = { userId: 'user-id', ipn: '1234567890' };
    const userUnitIds = { all: [1], head: [], member: [1] };

    await expect(taskBusiness.setStatusFinished('task-id', 'user-id', userUnitIds, false, { user, units: {} })).rejects.toEqual({
      message: 'Validation error.',
      details: validationErrors,
    });

    expect(DocumentValidatorService).toHaveBeenCalledTimes(1);
    expect(DocumentValidatorService).toHaveBeenCalledWith(
      jsonSchema,
      expect.objectContaining({ getFilteredRecordsByKeyIdArguments: { userUnitIds } }),
      user,
    );
    expect(check).toHaveBeenCalledWith({ step1: { fieldA: 'a' } });
  });

  it('appends the task trace meta so `$.workflow` functions resolve during the commit checks', async () => {
    await expect(
      taskBusiness.setStatusFinished('task-id', 'user-id', { all: [], head: [], member: [] }, false, { user: {}, units: {} }),
    ).rejects.toBeDefined();
    expect(global.models.task.getTraceMetaByTaskId).toHaveBeenCalledWith('task-id');
  });
});

describe('TaskBusiness id-api calls', () => {
  const USER_ID = '61efddaa351d6219eee09043';
  let taskBusiness: TaskBusiness;
  let client: Record<string, jest.Mock>;

  beforeEach(() => {
    new Sandbox();

    // Bypass the singleton constructor: the methods under test only need the id-api client.
    taskBusiness = Object.create(TaskBusiness.prototype);
    client = { getUsersByIds: jest.fn(), prepareUser: jest.fn() };
    taskBusiness.idApiClient = client as any;
    taskBusiness.sandbox = Sandbox.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setPerformerUsers', () => {
    it('looks the users up with the strict ids check and saves their names', async () => {
      const setPerformerUsers = jest.fn().mockResolvedValue({ id: 'task-id' });
      global.models = {
        task: { findById: jest.fn().mockResolvedValue({ isPerformerViaUnit: () => true }), setPerformerUsers },
      } as any;
      taskBusiness.customLogs = { saveCustomLog: jest.fn() };
      client.getUsersByIds.mockResolvedValue([{ userId: USER_ID, name: 'Ivanov Ivan' }]);

      await taskBusiness.setPerformerUsers('task-id', [USER_ID], [1], 'head-id');

      expect(client.getUsersByIds).toHaveBeenCalledWith([USER_ID], { withPrivateProps: false });
      expect(setPerformerUsers).toHaveBeenCalledWith('task-id', [USER_ID], ['Ivanov Ivan']);
    });

    it('wraps an error of id-api and keeps the cause', async () => {
      global.models = { task: { findById: jest.fn().mockResolvedValue({ isPerformerViaUnit: () => true }) } } as any;
      const error = new Error('Users list not responsed.');
      client.getUsersByIds.mockRejectedValue(error);

      await expect(taskBusiness.setPerformerUsers('task-id', [USER_ID], [1], 'head-id')).rejects.toMatchObject({
        message: 'Users list not responsed.',
        cause: error,
      });
    });
  });

  describe('calcSigners', () => {
    const signer = { ipn: '1234567890', email: 'ivan@example.com', firstName: 'Ivan', lastName: 'Ivanov' };
    let setSignerUsers: jest.Mock;

    beforeEach(() => {
      const task = { id: 'task-id', document: { documentTemplateId: 1 } };
      jest.spyOn(taskBusiness, 'findByIdAndCheckAccess').mockResolvedValue(task as any);
      jest.spyOn(taskBusiness, 'checkDraftExpired').mockReturnValue(false);
      jest.spyOn(taskBusiness, 'addTaskMetadata').mockResolvedValue(undefined as any);
      jest.spyOn(taskBusiness.sandbox, 'evalWithArgs').mockReturnValue([signer]);
      setSignerUsers = jest.fn().mockResolvedValue({ setIsMeSignerAndPerformer: jest.fn() });
      global.models = {
        documentTemplate: {
          findById: jest
            .fn()
            .mockResolvedValue({ jsonSchema: { isContinueSignAvailable: true, properties: { ms: { calcSigners: '(document) => []' } } } }),
        },
        task: { setSignerUsers },
      } as any;
    });

    it('prepares the signers by IPN and email only', async () => {
      client.prepareUser.mockResolvedValue({ userId: 'signer-id' });

      await taskBusiness.calcSigners('task-id', 'ms', USER_ID, { all: [], head: [], member: [] } as any, { ipn: '0987654321' });

      expect(client.prepareUser).toHaveBeenCalledWith({ name: null, surname: null, middleName: null, ipn: signer.ipn, email: signer.email });
      expect(setSignerUsers).toHaveBeenCalledWith('task-id', ['signer-id'], ['Ivanov Ivan']);
    });

    it('fails when id-api can not prepare a signer', async () => {
      client.prepareUser.mockResolvedValue(undefined);

      await expect(
        taskBusiness.calcSigners('task-id', 'ms', USER_ID, { all: [], head: [], member: [] } as any, { ipn: '0987654321' }),
      ).rejects.toThrow('Can not find or create all signers.');
      expect(setSignerUsers).not.toHaveBeenCalled();
    });
  });
});
