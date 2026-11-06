import { WorkflowBusiness } from './workflow';
import { XmlJsConverter } from '../lib/xml_js_converter';
import { resetAppContext, getLog, getMessageQueue, setAppContext } from '../lib/context';

const bpmnXml = (processId: string) =>
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL">' +
  `<bpmn2:process id="${processId}" isExecutable="false"><bpmn2:startEvent id="StartEvent_1" /></bpmn2:process>` +
  '</bpmn2:definitions>';

describe('WorkflowBusiness.findSchemaById', () => {
  afterEach(() => {
    resetAppContext();
  });

  let workflowBusiness: any;
  let findById: jest.Mock;

  beforeEach(() => {
    setAppContext({ log: { save: jest.fn() } as any });

    findById = jest.fn();
    workflowBusiness = Object.create(WorkflowBusiness.prototype);
    workflowBusiness.xmlJsConverter = new XmlJsConverter();
    workflowBusiness.workflowTemplateModel = { findById };
    workflowBusiness.bpmnSchemes = [{ id: 1, name: 'cached', schema: { cached: true } }];
  });

  it('returns a cached schema without loading the template', async () => {
    const schema = await workflowBusiness.findSchemaById(1);

    expect(schema).toEqual({ id: 1, name: 'cached', schema: { cached: true } });
    expect(findById).not.toHaveBeenCalled();
  });

  it('loads, parses and caches the schema of a template that is not cached yet', async () => {
    findById.mockResolvedValue({ id: 2, name: 'imported', xmlBpmnSchema: bpmnXml('Process_2'), isActive: true });

    const schema = await workflowBusiness.findSchemaById(2);

    expect(findById).toHaveBeenCalledWith(2);
    expect(schema).toMatchObject({ id: 2, name: 'imported' });
    expect(schema.schema.$.id).toBe('Process_2');
    expect(workflowBusiness.bpmnSchemes.map((item) => item.id)).toEqual([1, 2]);
    expect(getLog().save).toHaveBeenCalledWith('bpmn-schema-loaded-on-demand', { workflowTemplateId: 2 });
  });

  it('serves a schema loaded on demand from the cache next time', async () => {
    findById.mockResolvedValue({ id: 2, name: 'imported', xmlBpmnSchema: bpmnXml('Process_2'), isActive: true });

    await workflowBusiness.findSchemaById(2);
    await workflowBusiness.findSchemaById(2);

    expect(findById).toHaveBeenCalledTimes(1);
  });

  it('returns undefined for an inactive template, like the periodic reload', async () => {
    findById.mockResolvedValue({ id: 3, name: 'inactive', xmlBpmnSchema: bpmnXml('Process_3'), isActive: false });

    expect(await workflowBusiness.findSchemaById(3)).toBeUndefined();
    expect(workflowBusiness.bpmnSchemes.map((item) => item.id)).toEqual([1]);
  });

  it('returns undefined when the template does not exist', async () => {
    findById.mockRejectedValue(new TypeError("Cannot read properties of null (reading 'id')"));

    expect(await workflowBusiness.findSchemaById(4)).toBeUndefined();
    expect(workflowBusiness.bpmnSchemes.map((item) => item.id)).toEqual([1]);
  });

  it('returns undefined and caches nothing for a template with an invalid BPMN schema', async () => {
    findById.mockResolvedValue({ id: 5, name: 'broken', xmlBpmnSchema: '<bpmn2:definitions />', isActive: true });

    expect(await workflowBusiness.findSchemaById(5)).toBeUndefined();
    expect(workflowBusiness.bpmnSchemes.map((item) => item.id)).toEqual([1]);
    expect(getLog().save).toHaveBeenCalledWith('invalid-bpmn-schema', expect.anything());
  });
});

describe('WorkflowBusiness.createFromMessage', () => {
  const sequenceFlow = (id, sourceRef, targetRef) => ({ $: { id, sourceRef, targetRef } });
  const schema = {
    id: 1,
    schema: {
      'bpmn:sequenceFlow': [sequenceFlow('Flow_1', 'task-1', 'task-2'), sequenceFlow('Flow_2', 'task-2', 'endEvent_1')],
    },
  };

  let business: any;
  let workflow: any;
  let task: any;

  beforeEach(() => {
    setAppContext({ log: { save: jest.fn() } as any });
    setAppContext({ messageQueue: { produce: jest.fn() } as any });

    workflow = { id: 'wf', isFinal: false, data: { messages: [] } };
    task = { id: 't1', workflowId: 'wf', taskTemplateId: 1, finished: true, workflowEntity: { workflowTemplateId: 1 } };

    business = Object.create(WorkflowBusiness.prototype);
    business.bpmnSchemes = [schema];
    business.taskModel = { findById: jest.fn(async () => task) };
    business.workflowModel = {
      findById: jest.fn(async () => workflow),
      appendMessage: jest.fn(async (_id, message) => {
        workflow = { ...workflow, data: { messages: [...workflow.data.messages, message] } };
        return workflow;
      }),
      setError: jest.fn(),
    };
    business.workflowErrorModel = { create: jest.fn() };
    business.workflowTemplateModel = { findById: jest.fn() };
    business.systemNotifier = { sendEmails: jest.fn() };
  });

  it('forwards only whitelisted fields of a forwardToTask message to the task queue', async () => {
    const message = {
      forwardToTask: true,
      taskTemplateId: 5,
      workflowTemplateId: 1,
      createWorkflowId: 'new-wf',
      workflowParentId: 'parent',
      userId: 'system',
      initData: { a: 1 },
      isCreateByOtherSystem: true,
      taskId: 'x',
      foo: 'bar',
    };

    expect(await business.createFromMessage(message)).toBe(true);

    expect(getMessageQueue().produce).toHaveBeenCalledTimes(1);
    expect(getMessageQueue().produce).toHaveBeenCalledWith('writingQueueTask', {
      forwardToTask: true,
      taskTemplateId: 5,
      workflowTemplateId: 1,
      createWorkflowId: 'new-wf',
      workflowParentId: 'parent',
      userId: 'system',
      initData: { a: 1 },
    });
  });

  it('acks and drops a forwardToTask message without taskTemplateId or with a wrongly typed field', async () => {
    expect(await business.createFromMessage({ forwardToTask: true, foo: 'bar' })).toBe(true);
    expect(await business.createFromMessage({ forwardToTask: true, taskTemplateId: 5, initData: 'x' })).toBe(true);
    expect(await business.createFromMessage({ forwardToTask: true, taskTemplateId: { $ne: 1 } })).toBe(true);

    expect(getMessageQueue().produce).not.toHaveBeenCalled();
    expect(getLog().save).toHaveBeenCalledWith('forward-to-task-message-rejected', expect.any(Object));
  });

  it('advances a finished task once and records history', async () => {
    expect(await business.createFromMessage({ workflowId: 'wf', taskId: 't1' })).toBe(true);

    expect(getMessageQueue().produce).toHaveBeenCalledTimes(1);
    expect(getMessageQueue().produce).toHaveBeenCalledWith('writingQueueTask', expect.objectContaining({ taskTemplateId: 2 }));
    expect(workflow.data.messages.map((m) => m.type)).toEqual(['in', 'out']);
  });

  it('processes a re-sent message of an already finished task again (admin continue)', async () => {
    await business.createFromMessage({ workflowId: 'wf', taskId: 't1' });
    (getMessageQueue().produce as jest.Mock).mockClear();

    expect(await business.createFromMessage({ workflowId: 'wf', taskId: 't1' })).toBe(true);

    expect(getMessageQueue().produce).toHaveBeenCalledTimes(1);
    expect(workflow.data.messages.map((m) => m.type)).toEqual(['in', 'out', 'in', 'out']);
  });

  it('acks and drops an unfinished task without history, produce or error', async () => {
    task.finished = false;

    expect(await business.createFromMessage({ workflowId: 'wf', taskId: 't1' })).toBe(true);

    expect(getMessageQueue().produce).not.toHaveBeenCalled();
    expect(business.workflowModel.appendMessage).not.toHaveBeenCalled();
    expect(business.workflowModel.setError).not.toHaveBeenCalled();
  });

  it('drops an unfinished event and an unfinished gateway', async () => {
    business.eventModel = {
      findById: jest.fn(async () => ({ workflowId: 'wf', eventTemplateId: 1, done: false, workflowEntity: { workflowTemplateId: 1 } })),
    };
    business.gatewayModel = {
      findById: jest.fn(async () => ({ workflowId: 'wf', gatewayTemplateId: 1, data: {}, workflowEntity: { workflowTemplateId: 1 } })),
    };

    expect(await business.createFromMessage({ eventId: 'e1' })).toBe(true);
    expect(await business.createFromMessage({ gatewayId: 'g1' })).toBe(true);

    expect(business.workflowModel.appendMessage).not.toHaveBeenCalled();
    expect(getMessageQueue().produce).not.toHaveBeenCalled();
  });

  it('does not record history for a final workflow', async () => {
    workflow.isFinal = true;

    expect(await business.createFromMessage({ workflowId: 'wf', taskId: 't1' })).toBe(true);

    expect(business.workflowModel.appendMessage).not.toHaveBeenCalled();
    expect(getMessageQueue().produce).not.toHaveBeenCalled();
  });

  it('advances after an event that failed with notFailOnError (done: false, error marker in data)', async () => {
    business.eventModel = {
      findById: jest.fn(async () => ({
        workflowId: 'wf',
        eventTemplateId: 5,
        done: false,
        data: { error: 'Error: boom', notFailOnError: true },
        workflowEntity: { workflowTemplateId: 1 },
      })),
    };
    business.gatewayModel = { findById: jest.fn() };
    schema.schema['bpmn:sequenceFlow'].push(sequenceFlow('Flow_4', 'event-5', 'task-4'));

    await business.createFromMessage({ eventId: 'e1' });

    expect(getMessageQueue().produce).toHaveBeenCalledWith('writingQueueTask', expect.objectContaining({ taskTemplateId: 4 }));
  });

  it('advances a finished gateway and a done event', async () => {
    business.eventModel = {
      findById: jest.fn(async () => ({ workflowId: 'wf', eventTemplateId: 2, done: true, workflowEntity: { workflowTemplateId: 1 } })),
    };
    business.gatewayModel = { findById: jest.fn() };
    schema.schema['bpmn:sequenceFlow'].push(sequenceFlow('Flow_3', 'event-2', 'task-3'));

    await business.createFromMessage({ eventId: 'e1' });

    expect(getMessageQueue().produce).toHaveBeenCalledWith('writingQueueTask', expect.objectContaining({ taskTemplateId: 3 }));
  });

  it('marks the workflow as errored (no unhandled rejection) when publishing the next step fails', async () => {
    (getMessageQueue().produce as jest.Mock).mockRejectedValueOnce(new Error('Channel closed'));

    expect(await business.createFromMessage({ workflowId: 'wf', taskId: 't1' })).toBe(true);

    expect(business.workflowErrorModel.create).toHaveBeenCalledWith(expect.objectContaining({ error: 'Channel closed', workflowId: 'wf' }));
    expect(business.workflowModel.setError).toHaveBeenCalledWith('wf');
  });

  it('marks the workflow as errored when publishing to the gateway queue fails', async () => {
    const flows = schema.schema['bpmn:sequenceFlow'];
    const original = [...flows];
    flows.splice(0, flows.length, sequenceFlow('Flow_5', 'task-1', 'gateway-7'));
    (getMessageQueue().produce as jest.Mock).mockRejectedValueOnce(new Error('Channel closed'));

    try {
      await business.createFromMessage({ workflowId: 'wf', taskId: 't1' });
    } finally {
      flows.splice(0, flows.length, ...original);
    }

    expect(getMessageQueue().produce).toHaveBeenCalledWith('writingQueueGateway', expect.anything());
    expect(business.workflowModel.setError).toHaveBeenCalledWith('wf');
  });

  it('does not mark a forged workflowId as failed when the task is missing', async () => {
    task = undefined;

    expect(await business.createFromMessage({ taskId: 'missing', workflowId: 'victim' })).toBe(true);

    expect(business.workflowModel.setError).not.toHaveBeenCalled();
    expect(business.workflowErrorModel.create).toHaveBeenCalledWith(expect.objectContaining({ workflowId: undefined }));
  });

  it('does not mark a forged workflowId as failed for an invalid message object', async () => {
    expect(await business.createFromMessage({ workflowId: 'victim' })).toBe(true);

    expect(business.workflowModel.setError).not.toHaveBeenCalled();
  });

  it('marks the DB-derived workflow as failed, ignoring the forged message workflowId', async () => {
    business.workflowModel.appendMessage = jest.fn(async () => {
      throw new Error('boom');
    });

    expect(await business.createFromMessage({ taskId: 't1', workflowId: 'victim' })).toBe(true);

    expect(business.workflowModel.setError).toHaveBeenCalledTimes(1);
    expect(business.workflowModel.setError).toHaveBeenCalledWith('wf');
    expect(business.workflowErrorModel.create).toHaveBeenCalledWith(expect.objectContaining({ workflowId: 'wf' }));
    expect(business.systemNotifier.sendEmails).toHaveBeenCalledWith('wf', undefined, 'boom');
  });
});
