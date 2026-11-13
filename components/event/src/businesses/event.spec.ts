import { EventBusiness } from './event';

const WORKFLOW_ID = 'workflow-1';
const bpmn = (eventId: number) => `<bpmn:serviceTask id="event-${eventId}" />`;

describe('EventBusiness workflow verification', () => {
  const create = (workflow: any, xml: any = bpmn(5)) => {
    const business: any = Object.create(EventBusiness.prototype);
    business.workflowModel = { findById: jest.fn().mockResolvedValue(workflow) };
    business.workflowTemplateModel = { findXmlBpmnSchemaById: jest.fn().mockResolvedValue({ xmlBpmnSchema: xml }) };
    return business as EventBusiness;
  };

  describe('isEventTemplateInWorkflow', () => {
    it('is true when the schema contains the event node', async () => {
      await expect(create({ workflowTemplateId: 7 }).isEventTemplateInWorkflow(5, WORKFLOW_ID)).resolves.toBe(true);
    });

    it('is false for another event node, a missing workflow or a non numeric id', async () => {
      await expect(create({ workflowTemplateId: 7 }, bpmn(15)).isEventTemplateInWorkflow(5, WORKFLOW_ID)).resolves.toBe(false);
      await expect(create(undefined).isEventTemplateInWorkflow(5, WORKFLOW_ID)).resolves.toBe(false);
      await expect(create({ workflowTemplateId: 7 }).isEventTemplateInWorkflow('x' as any, WORKFLOW_ID)).resolves.toBe(false);
    });
  });

  describe('verifyMessageWorkflowId', () => {
    const message = { workflowId: WORKFLOW_ID, workflowTemplateId: 7, eventTemplateId: 5 };

    it('returns the workflow id when everything matches', async () => {
      await expect(create({ workflowTemplateId: 7 }).verifyMessageWorkflowId(message)).resolves.toBe(WORKFLOW_ID);
    });

    it('returns null without a workflow id, for a missing workflow, a template mismatch or an event outside the schema', async () => {
      await expect(create({ workflowTemplateId: 7 }).verifyMessageWorkflowId({ ...message, workflowId: undefined })).resolves.toBeNull();
      await expect(create(undefined).verifyMessageWorkflowId(message)).resolves.toBeNull();
      await expect(create({ workflowTemplateId: 8 }).verifyMessageWorkflowId(message)).resolves.toBeNull();
      await expect(create({ workflowTemplateId: 7 }, bpmn(15)).verifyMessageWorkflowId(message)).resolves.toBeNull();
    });

    it('returns null when a lookup throws', async () => {
      const business: any = create({ workflowTemplateId: 7 });
      business.workflowModel.findById.mockRejectedValue(new Error('db'));
      await expect(business.verifyMessageWorkflowId(message)).resolves.toBeNull();
    });
  });
});
