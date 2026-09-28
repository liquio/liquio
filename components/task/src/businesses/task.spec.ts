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
