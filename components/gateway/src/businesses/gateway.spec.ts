import { setAppContext, getLog, getMessageBus } from '../lib/context';
import { GatewayBusiness } from './gateway';

const mockEval = jest.fn();

jest.mock('@liquio/back-core', () => ({
  ...jest.requireActual('@liquio/back-core'),
  Sandbox: { getInstance: () => ({ evalWithArgs: (...args: any[]) => mockEval(...args) }) },
}));
jest.mock('../lib/system_notifier', () => ({
  SystemNotifier: class {
    sendEmails = jest.fn();
  },
}));
jest.mock('../models/model', () => ({
  Model: class {
    db = { define: jest.fn(() => new Proxy(class {}, { get: (target: any, key) => target[key] ?? jest.fn() })) };
  },
}));

const WORKFLOW_ID = 'workflow-1';
const bpmn = (gatewayId: number) => `<bpmn:exclusiveGateway id="Gateway-${gatewayId}" />`;

describe('GatewayBusiness', () => {
  let business: GatewayBusiness;

  beforeEach(() => {
    mockEval.mockReset();
    setAppContext({ log: { save: jest.fn() }, messageBus: { publish: jest.fn().mockResolvedValue({ messageId: 'x' }) } as any });
    (GatewayBusiness as any).singleton = undefined;
    business = new GatewayBusiness({});
  });

  describe('calcExclusiveGatewayData', () => {
    const schema = { formulas: [{ condition: 'async () => false' }, { condition: '() => false', isDefault: true }] };

    it('does not pick a branch whose async condition resolves to false', async () => {
      mockEval.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
      const result = await business.calcExclusiveGatewayData(schema, ['seq-0', 'seq-1'], [], []);
      expect(result.resultSequence).toBe('seq-1');
      expect(result.handledAsDefault).toBe(true);
      expect(mockEval.mock.calls[0][2]).toEqual({ isAsync: true });
    });

    it('picks a branch whose async condition resolves to true', async () => {
      mockEval.mockResolvedValueOnce(true);
      const result = await business.calcExclusiveGatewayData(schema, ['seq-0', 'seq-1'], [], []);
      expect(result.resultSequence).toBe('seq-0');
    });

    it('keeps synchronous conditions working', async () => {
      mockEval.mockReturnValueOnce(false).mockReturnValueOnce(true);
      const result = await business.calcExclusiveGatewayData(schema, ['seq-0', 'seq-1'], [], []);
      expect(result.resultSequence).toBe('seq-1');
    });
  });

  describe('createFromMessage', () => {
    const message = { workflowId: WORKFLOW_ID, workflowTemplateId: 7, gatewayTemplateId: 5, sequenceIds: ['a', 'b'], amqpMessageId: 'm1' };

    const setup = (workflow: any, xml: any) => {
      business.gatewayTemplateModel = { findById: jest.fn().mockResolvedValue({ gatewayTypeId: 1, name: 'g', jsonSchema: '{}' }) } as any;
      business.gatewayTypeModel = { findById: jest.fn().mockResolvedValue({ name: 'parallel' }) } as any;
      business.workflowModel = { findById: jest.fn().mockResolvedValue(workflow), setError: jest.fn() } as any;
      business.workflowTemplateModel = { findById: jest.fn().mockResolvedValue({ xmlBpmnSchema: xml }) } as any;
      business.taskModel = { getDocumentsByWorkflowId: jest.fn().mockResolvedValue([]) } as any;
      business.eventModel = {
        getDocumentsByWorkflowId: jest.fn().mockResolvedValue([]),
        getEventsByWorkflowId: jest.fn().mockResolvedValue([]),
      } as any;
      business.workflowHistoryModel = { findLastVersionByWorkflowTemplateId: jest.fn().mockResolvedValue({ version: 1 }) } as any;
      business.workflowErrorModel = { create: jest.fn() } as any;
      business.gatewayModel = { create: jest.fn().mockResolvedValue({ id: 99 }) } as any;
    };

    it('creates the gateway when the template belongs to the workflow template', async () => {
      setup({ workflowTemplateId: 7 }, bpmn(5));
      await business.createFromMessage(message);
      expect(business.gatewayModel.create).toHaveBeenCalledTimes(1);
      expect(getMessageBus().publish).toHaveBeenCalledWith('manager', { workflowId: WORKFLOW_ID, gatewayId: 99 });
    });

    it('logs only identifiers of the created gateway (GW-06b)', async () => {
      setup({ workflowTemplateId: 7 }, bpmn(5));
      business.gatewayModel = {
        create: jest.fn().mockResolvedValue({ id: 99, gatewayTypeId: 1, version: 3, data: { secretPayload: 'S' }, name: 'n' }),
      } as any;
      await business.createFromMessage(message);
      const call = getLog().save.mock.calls.find(([type]) => type === 'gateway-handling|db-instance-created');
      expect(call[1]).toEqual({ workflowId: WORKFLOW_ID, gatewayTemplateId: 5, gatewayId: 99, gatewayTypeId: 1, version: 3 });
      expect(JSON.stringify(call)).not.toContain('secretPayload');
    });

    it('runs the error path when publish rejects', async () => {
      setup({ workflowTemplateId: 7 }, bpmn(5));
      (getMessageBus().publish as jest.Mock).mockRejectedValueOnce(new Error('bus down'));
      business.workflowErrorModel = { create: jest.fn().mockResolvedValue(12) } as any;
      await expect(business.createFromMessage(message)).resolves.toBe(true);
      expect(business.workflowErrorModel.create).toHaveBeenCalledWith(expect.objectContaining({ error: 'bus down' }), { workflowId: WORKFLOW_ID });
      expect(business.workflowModel.setError).toHaveBeenCalledWith(WORKFLOW_ID);
      const call = getLog().save.mock.calls.find(([type]) => type === 'document-creating-by-message-from-queue-error');
      expect(call[1]).toMatchObject({ workflowId: WORKFLOW_ID, errorId: 12, error: { name: 'Error' } });
      expect(JSON.stringify(call)).not.toContain('bus down');
    });

    it('does not link or notify through a foreign workflow when failing before the check', async () => {
      setup({ workflowTemplateId: 7 }, bpmn(15));
      business.gatewayTemplateModel = { findById: jest.fn().mockRejectedValue(new Error('boom')) } as any;
      business.workflowErrorModel = { create: jest.fn().mockResolvedValue(3) } as any;
      await business.createFromMessage(message);
      expect(business.workflowErrorModel.create).toHaveBeenCalledWith(expect.anything(), { workflowId: null });
      expect(business.workflowModel.setError).not.toHaveBeenCalled();
      expect(business.systemNotifier.sendEmails).not.toHaveBeenCalled();
      const call = getLog().save.mock.calls.find(([type]) => type === 'document-creating-by-message-from-queue-error');
      expect(call[1]).toMatchObject({ errorId: 3, workflowLinked: false });
    });

    it('links, marks and notifies on a normal failure', async () => {
      setup({ workflowTemplateId: 7 }, bpmn(5));
      business.gatewayTypeModel = { findById: jest.fn().mockResolvedValue({ name: 'unknown' }) } as any;
      business.workflowErrorModel = { create: jest.fn().mockResolvedValue(4) } as any;
      business.workflowTemplateModel = {
        findById: jest.fn().mockResolvedValue({ xmlBpmnSchema: bpmn(5) }),
        findIdAndNameAndErrorsSubscribersById: jest.fn().mockResolvedValue({ name: 'wt' }),
      } as any;
      business.gatewayTemplateModel = {
        findById: jest.fn().mockResolvedValue({ gatewayTypeId: 1, name: 'g', jsonSchema: '{}' }),
        findIdAndNameById: jest.fn().mockResolvedValue({ id: 5, name: 'g' }),
      } as any;
      await business.createFromMessage(message);
      expect(business.workflowErrorModel.create).toHaveBeenCalledWith(expect.anything(), { workflowId: WORKFLOW_ID });
      expect(business.workflowModel.setError).toHaveBeenCalledWith(WORKFLOW_ID);
      expect(business.systemNotifier.sendEmails).toHaveBeenCalledWith(expect.objectContaining({ workflowId: WORKFLOW_ID }));
    });

    it.each([
      ['gateway is not in the workflow template', { workflowTemplateId: 7 }, bpmn(15)],
      ['workflow is missing', undefined, bpmn(5)],
      ['workflow has no template', { workflowTemplateId: null }, bpmn(5)],
    ])('acks without computing a result when %s', async (_name, workflow, xml) => {
      setup(workflow, xml);
      await expect(business.createFromMessage(message)).resolves.toBe(true);
      expect(business.gatewayModel.create).not.toHaveBeenCalled();
      expect(getMessageBus().publish).not.toHaveBeenCalled();
      expect(business.workflowErrorModel.create).not.toHaveBeenCalled();
      expect(business.workflowModel.setError).not.toHaveBeenCalled();
      const logged = JSON.stringify(getLog().save.mock.calls);
      expect(logged).toContain('template-workflow-mismatch');
    });
  });

  describe('verifyMessageWorkflowId', () => {
    const message = { workflowId: WORKFLOW_ID, workflowTemplateId: 7, gatewayTemplateId: 5 };
    const setup = (workflow: any, xml: any = bpmn(5)) => {
      business.workflowModel = { findById: jest.fn().mockResolvedValue(workflow) } as any;
      business.workflowTemplateModel = { findById: jest.fn().mockResolvedValue({ xmlBpmnSchema: xml }) } as any;
    };

    it('returns the workflow id when everything matches', async () => {
      setup({ workflowTemplateId: 7 });
      await expect(business.verifyMessageWorkflowId(message)).resolves.toBe(WORKFLOW_ID);
    });

    it('returns null when the workflow is missing', async () => {
      setup(undefined);
      await expect(business.verifyMessageWorkflowId(message)).resolves.toBeNull();
    });

    it('returns null on a template mismatch', async () => {
      setup({ workflowTemplateId: 8 });
      await expect(business.verifyMessageWorkflowId(message)).resolves.toBeNull();
    });

    it('returns null when the gateway is not in the schema', async () => {
      setup({ workflowTemplateId: 7 }, bpmn(15));
      await expect(business.verifyMessageWorkflowId(message)).resolves.toBeNull();
    });

    it('returns null when a lookup throws', async () => {
      business.workflowModel = { findById: jest.fn().mockRejectedValue(new Error('db')) } as any;
      await expect(business.verifyMessageWorkflowId(message)).resolves.toBeNull();
    });
  });

  describe('getSequenceIdsFromLatestGatewayInWorkflow', () => {
    it('returns sequence ids and logs only the gateway id (GW-06b)', async () => {
      business.gatewayModel = {
        getLatestGatewayInWorkflow: jest.fn().mockResolvedValue({ id: 7, data: { sequenceIds: ['s1'], secretPayload: 'S' } }),
      } as any;
      await expect(business.getSequenceIdsFromLatestGatewayInWorkflow(5, WORKFLOW_ID)).resolves.toEqual(['s1']);
      const call = getLog().save.mock.calls.find(([type]) => type === 'get-sequence-ids-from-latest-gateway');
      expect(call[1]).toEqual({ gatewayTemplateId: 5, workflowId: WORKFLOW_ID, sequenceIds: ['s1'], latestGatewayId: 7 });
      expect(JSON.stringify(call)).not.toContain('secretPayload');
    });
  });
});
