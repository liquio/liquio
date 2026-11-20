import { setAppContext } from '../lib/context';
import { WorkflowHandlerBusiness } from './workflow_handler';

describe('WorkflowHandlerBusiness', () => {
  const publish = jest.fn();
  const findById = (rows: Record<string, any>) => jest.fn(async (id) => rows[id]);
  let business: WorkflowHandlerBusiness;

  beforeEach(() => {
    publish.mockReset().mockResolvedValue({ messageId: 'x' });
    setAppContext({
      config: {},
      log: { save: jest.fn() },
      messageBus: { publish } as any,
      models: {
        workflow: { findById: findById({ w1: { id: 'w1' }, w2: { id: 'w2' } }) },
        task: { findById: findById({ t1: { workflowId: 'w1' }, t2: { workflowId: 'w2' } }) },
        event: { findById: findById({ e1: { workflowId: 'w1' } }) },
        gateway: { findById: findById({ g1: { workflowId: 'w1' } }) },
      },
    });
    business = new WorkflowHandlerBusiness();
  });

  describe('pushInQueue', () => {
    it.each(['foo', '__proto__', 'constructor', 'toString'])('rejects the wrong queue name %s', async (name) => {
      await expect(business.pushInQueue(name, {})).rejects.toThrow('Wrong queue name.');
      expect(publish).not.toHaveBeenCalled();
    });

    it('publishes to the destination with the message id from the body', async () => {
      const message: any = { workflowId: 'w1' };
      await business.pushInQueue('writingQueueTask', message);
      expect(message.amqpMessageId).toEqual(expect.any(String));
      expect(publish).toHaveBeenCalledWith('task', message, { messageId: message.amqpMessageId });
    });

    it('propagates a publish failure', async () => {
      publish.mockRejectedValue(new Error('unavailable'));
      await expect(business.pushInQueue('writingQueueManager', { workflowId: 'w1' })).rejects.toThrow('unavailable');
    });
  });

  describe('assertMessageBelongsToWorkflow', () => {
    const rejects = async (message: any, text: string, workflowId = 'w1') => {
      await expect(business.assertMessageBelongsToWorkflow(workflowId, message)).rejects.toThrow(text);
    };

    it('answers 404 for an unknown workflow', async () => {
      await expect(business.assertMessageBelongsToWorkflow('nope', { workflowId: 'nope' })).rejects.toMatchObject({
        httpStatusCode: 404,
        message: 'Workflow not found.',
      });
    });

    it('rejects a foreign workflowId', async () => {
      await rejects({ workflowId: 'w2' }, 'Message workflowId does not match the workflow in the URL.');
    });

    it('rejects an unknown or foreign entity', async () => {
      await rejects({ taskId: 'nope' }, 'Referenced task not found.');
      await rejects({ eventId: 'nope' }, 'Referenced event not found.');
      await rejects({ gatewayId: 'nope' }, 'Referenced gateway not found.');
      await rejects({ taskId: 't2' }, 'Referenced task does not belong to the workflow in the URL.');
      await rejects({ workflowId: 'w1', taskId: { a: 1 } }, 'Referenced task not found.');
    });

    it('rejects a message without any reference', async () => {
      await rejects({ taskTemplateId: 1 }, 'Message must reference the workflow');
      await rejects({}, 'Message must reference the workflow');
    });

    it('accepts a matching workflowId or entity of the workflow', async () => {
      await expect(business.assertMessageBelongsToWorkflow('w1', { workflowId: 'w1', taskTemplateId: 1 })).resolves.toBeUndefined();
      await expect(business.assertMessageBelongsToWorkflow('w1', { taskId: 't1' })).resolves.toBeUndefined();
      await expect(business.assertMessageBelongsToWorkflow('w1', { eventId: 'e1', gatewayId: 'g1' })).resolves.toBeUndefined();
    });
  });

  describe('assertMessageReferences', () => {
    it('checks entities against the calculated workflow', async () => {
      await expect(business.assertMessageReferences('w1', { workflowId: 'w1', taskId: 't1' })).resolves.toBeUndefined();
      await expect(business.assertMessageReferences('w1', { workflowId: 'w1', taskId: 't2' })).rejects.toThrow('does not belong');
      await expect(business.assertMessageReferences('w1', { stepId: 'a' })).rejects.toThrow('Message must reference');
    });
  });
});
