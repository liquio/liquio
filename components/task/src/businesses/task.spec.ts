import { Sandbox } from '@liquio/back-core';

import { TaskBusiness } from './task';
import { setAppContext, resetAppContext, getModels } from '../lib/context';
import { DocumentValidatorService } from '../services/document_validator';

jest.mock('../services/document_validator', () => ({
  DocumentValidatorService: jest.fn(),
}));

beforeEach(() => {
  setAppContext({ log: { save: jest.fn() } as any });
});

afterEach(() => {
  resetAppContext();
});

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
    setAppContext({
      models: {
        task: {
          findById: jest.fn().mockResolvedValue(task),
          getTraceMetaByTaskId: jest.fn().mockResolvedValue({ taskId: 'task-id', workflowTemplateId: 3 }),
        },
        workflow: { findById: jest.fn().mockResolvedValue({ workflowTemplate: { data: {} } }) },
        taskTemplate: { findById: jest.fn().mockResolvedValue({ jsonSchema: {} }) },
        documentTemplate: { findById: jest.fn().mockResolvedValue({ jsonSchema }) },
        workflowError: { create: jest.fn().mockResolvedValue(undefined) },
      } as any,
    });
    setAppContext({
      businesses: {
        register: { getFilteredRecordsByKeyId: jest.fn() },
      } as any,
    });
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
    expect(getModels().task.getTraceMetaByTaskId).toHaveBeenCalledWith('task-id');
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
      setAppContext({
        models: {
          task: { findById: jest.fn().mockResolvedValue({ isPerformerViaUnit: () => true }), setPerformerUsers },
        } as any,
      });
      taskBusiness.customLogs = { saveCustomLog: jest.fn() };
      client.getUsersByIds.mockResolvedValue([{ userId: USER_ID, name: 'Ivanov Ivan' }]);

      await taskBusiness.setPerformerUsers('task-id', [USER_ID], [1], 'head-id');

      expect(client.getUsersByIds).toHaveBeenCalledWith([USER_ID], { withPrivateProps: false });
      expect(setPerformerUsers).toHaveBeenCalledWith('task-id', [USER_ID], ['Ivanov Ivan']);
    });

    it('wraps an error of id-api and keeps the cause', async () => {
      setAppContext({ models: { task: { findById: jest.fn().mockResolvedValue({ isPerformerViaUnit: () => true }) } } as any });
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
      setAppContext({
        models: {
          documentTemplate: {
            findById: jest
              .fn()
              .mockResolvedValue({ jsonSchema: { isContinueSignAvailable: true, properties: { ms: { calcSigners: '(document) => []' } } } }),
          },
          task: { setSignerUsers },
        } as any,
      });
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

describe('TaskBusiness.create in an existing workflow', () => {
  const USER_ID = 'user-id';
  let taskBusiness: TaskBusiness;
  let workflow: { workflowTemplateId: number; hasAccess: jest.Mock };
  let changeIsCurrentStateToOld: jest.Mock;

  const baseOptions = { workflowId: 'wf-id', workflowTemplateId: 5, taskTemplateId: 7, userId: USER_ID, userInfo: {} };

  beforeEach(() => {
    taskBusiness = Object.create(TaskBusiness.prototype);
    jest.spyOn(taskBusiness as any, '_assertOnboarding').mockResolvedValue(undefined);
    jest.spyOn(taskBusiness as any, 'appendTraceMeta').mockImplementation(() => undefined);
    jest.spyOn(taskBusiness as any, 'getTraceId').mockReturnValue('trace');

    workflow = { workflowTemplateId: 5, hasAccess: jest.fn().mockReturnValue(true) };
    changeIsCurrentStateToOld = jest.fn();
    setAppContext({ config: {} as any });
    setAppContext({
      models: {
        workflowTemplate: { findById: jest.fn().mockResolvedValue({ isActive: true }) },
        taskTemplate: { findById: jest.fn().mockResolvedValue({ jsonSchema: {} }) },
        workflow: { findById: jest.fn().mockImplementation(async () => workflow) },
        task: {
          findCurrentTaskByWorkflowIdAndTaskTemplateID: jest.fn().mockRejectedValue(new Error('past access checks')),
          changeIsCurrentStateToOld,
        },
      } as any,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects a user without access to the workflow with 403 and changes nothing', async () => {
    workflow.hasAccess.mockReturnValue(false);
    const unitIds = { all: [1], head: [], member: [1] };

    await expect(taskBusiness.create({ ...baseOptions, unitIds })).rejects.toMatchObject({
      httpStatusCode: 403,
      message: "User doesn't have any access to workflow.",
    });
    expect(workflow.hasAccess).toHaveBeenCalledWith(USER_ID, unitIds);
    expect(changeIsCurrentStateToOld).not.toHaveBeenCalled();
  });

  it('rejects a workflowTemplateId that does not match the workflow with 400', async () => {
    await expect(taskBusiness.create({ ...baseOptions, workflowTemplateId: 6, unitIds: {} })).rejects.toMatchObject({ httpStatusCode: 400 });
    expect(changeIsCurrentStateToOld).not.toHaveBeenCalled();
  });

  it('lets a user with access pass the checks, comparing the template id numerically', async () => {
    await expect(taskBusiness.create({ ...baseOptions, workflowTemplateId: '5', unitIds: {} })).rejects.toThrow('past access checks');
    expect(workflow.hasAccess).toHaveBeenCalled();
  });

  it.each([['isCreateByOtherSystem'], ['isCreateFromRmqMessage']])('skips the access check for %s', async (flag) => {
    workflow.hasAccess.mockReturnValue(false);

    await expect(taskBusiness.create({ ...baseOptions, [flag]: true })).rejects.toThrow('past access checks');
    expect(workflow.hasAccess).not.toHaveBeenCalled();
  });

  it.each([['isCreateByOtherSystem'], ['isCreateFromRmqMessage']])('does not skip the access check for an inherited %s', async (flag) => {
    workflow.hasAccess.mockReturnValue(false);
    const options = Object.assign(Object.create({ [flag]: true }), { ...baseOptions });

    await expect(taskBusiness.create(options)).rejects.toMatchObject({ httpStatusCode: 403 });
    expect(workflow.hasAccess).toHaveBeenCalled();
  });
});

describe('TaskBusiness.create performer resolution by email', () => {
  const VICTIM_EMAIL = 'victim@x.test';
  const STOP = new Error('stop after task.create');
  let taskBusiness: TaskBusiness;
  let taskCreate: jest.Mock;
  let getUserByEmail: jest.Mock;
  let requestedEmails: string[];
  let log: { save: jest.Mock };

  const victim = { userId: 'victim-user-id', name: 'Victim', email: VICTIM_EMAIL };
  const attacker = { userId: 'attacker-user-id', name: 'Attacker', email: `${VICTIM_EMAIL}.evil.example` };
  const baseOptions = { workflowId: 'wf-id', workflowTemplateId: 5, taskTemplateId: 7, userId: 'creator-id', userInfo: {}, unitIds: {} };

  const createdArgs = async (): Promise<any> => {
    await expect(taskBusiness.create(baseOptions as any)).rejects.toBe(STOP);
    return taskCreate.mock.calls[0][0];
  };

  beforeEach(() => {
    new Sandbox();
    requestedEmails = [VICTIM_EMAIL];
    log = { save: jest.fn() };
    setAppContext({ log: log as any });

    taskBusiness = Object.create(TaskBusiness.prototype);
    taskBusiness.sandbox = Sandbox.getInstance();
    jest.spyOn(taskBusiness as any, '_assertOnboarding').mockResolvedValue(undefined);
    jest.spyOn(taskBusiness as any, 'appendTraceMeta').mockImplementation(() => undefined);
    jest.spyOn(taskBusiness as any, 'getTraceId').mockReturnValue('trace');
    jest.spyOn(taskBusiness as any, 'calculateAndUpdateDraftExpiredAt').mockResolvedValue(undefined);
    jest.spyOn(taskBusiness as any, 'calculateNewTaskParams').mockResolvedValue({});
    jest.spyOn(taskBusiness as any, 'getTaskPermissions').mockImplementation(async () => ({
      performerUnits: [],
      requiredPerformerUnits: [],
      performerUsers: [],
      performerUsersIpn: [],
      performerUsersEmail: requestedEmails,
      signerUsers: [],
      onlyForHeads: [],
    }));
    getUserByEmail = jest.fn().mockResolvedValue([attacker, victim]);
    (taskBusiness as any).idApiClient = { getUserByEmail, getUsersByIds: jest.fn().mockResolvedValue([]), getUserByCode: jest.fn() };

    taskCreate = jest.fn().mockRejectedValue(STOP);
    const workflow = { workflowTemplateId: 5, hasAccess: jest.fn().mockReturnValue(true) };
    setAppContext({ config: {} as any });
    setAppContext({
      models: {
        workflowTemplate: { findById: jest.fn().mockResolvedValue({ id: 5, isActive: true, data: {} }) },
        taskTemplate: { findById: jest.fn().mockResolvedValue({ jsonSchema: {} }) },
        workflow: { findById: jest.fn().mockResolvedValue(workflow) },
        workflowHistory: { findLastVersionByWorkflowTemplateId: jest.fn().mockResolvedValue(undefined) },
        task: {
          findCurrentTaskByWorkflowIdAndTaskTemplateID: jest.fn().mockResolvedValue(undefined),
          findLastTaskId: jest.fn().mockResolvedValue(undefined),
          changeIsCurrentStateToOld: jest.fn(),
          getDocumentsByWorkflowId: jest.fn().mockResolvedValue([]),
          create: taskCreate,
        },
        event: { getEventsByWorkflowId: jest.fn().mockResolvedValue([]) },
      } as any,
      businesses: { task: { handleActivityTypeEvents: jest.fn() } } as any,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not grant access to a user whose email only starts with the requested one', async () => {
    const { performerUsers, performerUserNames, performerUsersEmail } = await createdArgs();

    expect(performerUsers).not.toContain('attacker-user-id');
    expect(performerUsers).toContain('victim-user-id');
    expect(performerUserNames).toEqual(['Victim']);
    expect(performerUsersEmail).toEqual([]);
  });

  it('resolves the owner when the requested email differs only in case and spaces', async () => {
    requestedEmails = [' Victim@X.test '];

    const { performerUsers, performerUsersEmail } = await createdArgs();

    expect(performerUsers).toEqual(['victim-user-id']);
    expect(performerUsersEmail).toEqual([]);
  });

  it('adds no performer and keeps the email unresolved when only a prefix sibling is returned', async () => {
    getUserByEmail.mockResolvedValue([attacker]);

    const { performerUsers, performerUsersEmail } = await createdArgs();

    expect(performerUsers).toEqual([]);
    expect(performerUsersEmail).toEqual([VICTIM_EMAIL]);
  });

  it('drops a returned user without email', async () => {
    getUserByEmail.mockResolvedValue([{ userId: 'no-email-user-id', name: 'No Email' }, victim]);

    const { performerUsers } = await createdArgs();

    expect(performerUsers).toEqual(['victim-user-id']);
  });

  it('logs only counts when returned users are dropped', async () => {
    await createdArgs();

    expect(log.save).toHaveBeenCalledWith('create-task-performer-email-mismatch', { returned: 2, verified: 1 }, 'warn');
    expect(JSON.stringify(log.save.mock.calls)).not.toContain(VICTIM_EMAIL);
  });

  it('does not log when every returned user matches', async () => {
    getUserByEmail.mockResolvedValue([victim]);

    await createdArgs();

    expect(log.save).not.toHaveBeenCalledWith('create-task-performer-email-mismatch', expect.anything(), 'warn');
  });
});

describe('TaskBusiness trusted workflow linking for queue messages', () => {
  let taskBusiness: any;
  let workflowFindById: jest.Mock;
  let findXmlBpmnSchemaById: jest.Mock;
  let hasTaskTemplateIdInBpmnSchema: jest.Mock;
  let workflowErrorCreate: jest.Mock;
  let setError: jest.Mock;
  let publish: jest.Mock;
  let save: jest.Mock;

  const workflow = { id: 'wf-1', workflowTemplateId: 5 };

  beforeEach(() => {
    taskBusiness = Object.create(TaskBusiness.prototype);
    workflowFindById = jest.fn().mockResolvedValue(workflow);
    findXmlBpmnSchemaById = jest.fn().mockResolvedValue('<xml/>');
    hasTaskTemplateIdInBpmnSchema = jest.fn().mockResolvedValue(true);
    workflowErrorCreate = jest.fn().mockResolvedValue(42);
    setError = jest.fn().mockResolvedValue(undefined);
    publish = jest.fn().mockResolvedValue({ messageId: 'x' });
    save = jest.fn();
    taskBusiness.systemNotifier = { sendEmails: jest.fn().mockResolvedValue(undefined) };
    setAppContext({
      log: { save } as any,
      messageBus: { publish } as any,
      config: {} as any,
      businesses: { workflow: { hasTaskTemplateIdInBpmnSchema } } as any,
      models: {
        workflow: { findById: workflowFindById, setError },
        workflowTemplate: { findXmlBpmnSchemaById, findById: jest.fn().mockResolvedValue({ name: 'tpl', errorsSubscribers: [] }) },
        taskTemplate: { findById: jest.fn().mockResolvedValue({ id: 7, jsonSchema: {} }) },
        workflowError: { create: workflowErrorCreate },
      } as any,
    });
  });

  describe('isTaskTemplateInWorkflow', () => {
    it('checks the task template against the BPMN schema of the workflow template', async () => {
      await expect(taskBusiness.isTaskTemplateInWorkflow(7, 'wf-1')).resolves.toBe(true);
      expect(findXmlBpmnSchemaById).toHaveBeenCalledWith(5);
      expect(hasTaskTemplateIdInBpmnSchema).toHaveBeenCalledWith('<xml/>', 7);
    });

    it('is false for an unknown workflow or a missing schema', async () => {
      workflowFindById.mockResolvedValueOnce(undefined);
      await expect(taskBusiness.isTaskTemplateInWorkflow(7, 'nope')).resolves.toBe(false);
      findXmlBpmnSchemaById.mockResolvedValueOnce(undefined);
      await expect(taskBusiness.isTaskTemplateInWorkflow(7, 'wf-1')).resolves.toBe(false);
    });
  });

  describe('verifyMessageWorkflowId', () => {
    it('returns the workflow id when the workflow, template and BPMN node match', async () => {
      await expect(taskBusiness.verifyMessageWorkflowId({ workflowId: 'wf-1', workflowTemplateId: 5, taskTemplateId: 7 })).resolves.toBe('wf-1');
    });

    it.each([
      ['no workflow id', { taskTemplateId: 7 }],
      ['a workflow template mismatch', { workflowId: 'wf-1', workflowTemplateId: 6, taskTemplateId: 7 }],
    ])('returns null for %s', async (_title, message) => {
      await expect(taskBusiness.verifyMessageWorkflowId(message)).resolves.toBeNull();
    });

    it('returns null for an unknown workflow, a template outside the BPMN schema and a failing lookup', async () => {
      workflowFindById.mockResolvedValueOnce(undefined);
      await expect(taskBusiness.verifyMessageWorkflowId({ workflowId: 'x', taskTemplateId: 7 })).resolves.toBeNull();
      hasTaskTemplateIdInBpmnSchema.mockResolvedValueOnce(false);
      await expect(taskBusiness.verifyMessageWorkflowId({ workflowId: 'wf-1', taskTemplateId: 7 })).resolves.toBeNull();
      workflowFindById.mockRejectedValueOnce(new Error('db'));
      await expect(taskBusiness.verifyMessageWorkflowId({ workflowId: 'wf-1', taskTemplateId: 7 })).resolves.toBeNull();
    });
  });

  describe('createFromMessage failure path', () => {
    const message = { workflowId: 'wf-1', workflowTemplateId: 5, taskTemplateId: 7, initData: { secret: 'SENTINEL-I' } };

    beforeEach(() => {
      jest.spyOn(taskBusiness, 'create').mockRejectedValue(new Error('SENTINEL-MSG'));
    });

    it('links the row, marks the workflow and notifies for a verified workflow', async () => {
      await expect(taskBusiness.createFromMessage(message)).resolves.toBe(true);
      expect(workflowErrorCreate).toHaveBeenCalledWith(expect.objectContaining({ queueMessage: message }), 'error', { workflowId: 'wf-1' });
      expect(setError).toHaveBeenCalledWith('wf-1');
      expect(taskBusiness.systemNotifier.sendEmails).toHaveBeenCalled();
      expect(save).toHaveBeenCalledWith(
        'document-creating-by-message-from-queue-error',
        expect.objectContaining({ errorId: 42, error: { name: 'Error' } }),
      );
    });

    it('stores an unlinked row and does not mark or notify when the workflow is not verified', async () => {
      hasTaskTemplateIdInBpmnSchema.mockResolvedValue(false);
      await expect(taskBusiness.createFromMessage(message)).resolves.toBe(true);
      expect(workflowErrorCreate).toHaveBeenCalledWith(expect.anything(), 'error', { workflowId: null });
      expect(setError).not.toHaveBeenCalled();
      expect(taskBusiness.systemNotifier.sendEmails).not.toHaveBeenCalled();
      expect(save).toHaveBeenCalledWith('document-creating-by-message-from-queue-error', expect.objectContaining({ workflowLinked: false }));
    });

    it('keeps messages without a workflow id unlinked as before', async () => {
      await taskBusiness.createFromMessage({ taskTemplateId: 7 });
      expect(workflowErrorCreate).toHaveBeenCalledWith(expect.anything(), 'error', {});
    });

    it('drops a message from another system that is not allowed silently', async () => {
      jest.spyOn(taskBusiness, 'checkCreateByOtherSystemFromMessage').mockReturnValue(false);
      await expect(taskBusiness.createFromMessage({ ...message, isCreateByOtherSystem: true })).resolves.toBeUndefined();
      expect(taskBusiness.create).not.toHaveBeenCalled();
    });

    it('logs no message body and no error text', async () => {
      await taskBusiness.createFromMessage(message);
      const logged = JSON.stringify(save.mock.calls);
      expect(logged).not.toContain('SENTINEL');
    });

    it('publishes a postponed retry through the bus', async () => {
      (getModels().taskTemplate.findById as jest.Mock).mockResolvedValue({ id: 7, jsonSchema: { retryIfError: ['10m'] } });
      await taskBusiness.createFromMessage(message);
      expect(publish).toHaveBeenCalledWith('task', expect.objectContaining({ retryIterator: 1 }), { delayMs: 10 * 60 * 1000 });
      expect(workflowErrorCreate).toHaveBeenCalledWith(expect.anything(), 'warning', { workflowId: 'wf-1' });
    });
  });
});
