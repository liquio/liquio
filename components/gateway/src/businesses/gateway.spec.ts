import { GatewayBusiness } from './gateway';

const mockEval = jest.fn();

jest.mock('@liquio/back-core', () => ({ Sandbox: { getInstance: () => ({ evalWithArgs: (...args: any[]) => mockEval(...args) }) } }));
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
    (global as any).log = { save: jest.fn() };
    (global as any).messageQueue = { produce: jest.fn() };
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
      expect((global as any).messageQueue.produce).toHaveBeenCalledWith({ workflowId: WORKFLOW_ID, gatewayId: 99 });
    });

    it.each([
      ['gateway is not in the workflow template', { workflowTemplateId: 7 }, bpmn(15)],
      ['workflow is missing', undefined, bpmn(5)],
      ['workflow has no template', { workflowTemplateId: null }, bpmn(5)],
    ])('acks without computing a result when %s', async (_name, workflow, xml) => {
      setup(workflow, xml);
      await expect(business.createFromMessage(message)).resolves.toBe(true);
      expect(business.gatewayModel.create).not.toHaveBeenCalled();
      expect((global as any).messageQueue.produce).not.toHaveBeenCalled();
      expect(business.workflowErrorModel.create).not.toHaveBeenCalled();
      expect(business.workflowModel.setError).not.toHaveBeenCalled();
      const logged = JSON.stringify((global as any).log.save.mock.calls);
      expect(logged).toContain('template-workflow-mismatch');
    });
  });
});
