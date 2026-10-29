import { TestApp } from './test-app';
import { WorkflowLoggerService } from '../src/services/workflow_logger';

// WorkflowLoggerService: builds the log of a workflow from its messages, tasks, events, gateways, errors and restarts.
describe('Workflow logger service', () => {
  let app: TestApp;
  const models = () => (global as any).models;
  const at = (day: number) => new Date(`2026-01-0${day}T00:00:00.000Z`);

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  const dated = (day: number, extra: any = {}) => ({ createdAt: at(day), updatedAt: at(day), ...extra });
  const workflow = () => ({
    data: {
      messages: [
        { type: 'in', data: {}, sequences: [], createdAt: at(1) },
        { type: 'out', data: {}, sequences: [], createdAt: at(2) },
        { type: 'other', createdAt: at(3) },
      ],
    },
    tasks: [
      { ...dated(2), id: 't1', name: null, taskTemplateId: 1, documentId: 'd1', performerUsers: [], performerUnits: [], requiredPerformerUnits: [] },
      {
        ...dated(3),
        id: 't2',
        name: 'Named',
        taskTemplateId: 2,
        documentId: 'missing',
        performerUsers: ['u'],
        performerUnits: [],
        requiredPerformerUnits: [],
      },
    ],
    events: [dated(4, { id: 'e1' })],
    gateways: [dated(5, { id: 'g1' })],
    workflowErrors: [
      { ...dated(6), type: 'error', data: { queueMessage: { taskTemplateId: 1 } } },
      { ...dated(6), type: 'error', data: { queueMessage: { eventTemplateId: 1 } } },
      { ...dated(6), type: 'warning', data: { queueMessage: { gatewayTemplateId: 1 } } },
      { ...dated(6), type: 'error', data: null },
    ],
    workflowRestarts: [dated(7, { id: 'r1' })],
  });

  it('collects the logs of all workflow parts', async () => {
    jest.spyOn(models().workflow, 'findById').mockResolvedValue(workflow() as any);
    jest.spyOn(models().taskTemplate, 'findById').mockResolvedValue({ name: 'Task template' } as any);
    jest.spyOn(models().eventTemplate, 'findById').mockResolvedValue({ name: 'Event template' } as any);
    jest.spyOn(models().gatewayTemplate, 'findById').mockResolvedValue({ name: 'Gateway template' } as any);
    jest.spyOn(models().document, 'findById').mockImplementation((async (id: string) => (id === 'd1' ? { id: 'd1' } : undefined)) as any);
    jest.spyOn(models().documentAttachment, 'getByDocumentId').mockResolvedValue([{ id: 'a' }] as any);
    jest.spyOn(models().documentSignature, 'getByDocumentId').mockResolvedValue([{ id: 's' }] as any);
    const result = await new WorkflowLoggerService().findById('wf-1', ['admin']);
    const types = (result as any).logs.map((v) => v.type);
    expect(types).toEqual(
      expect.arrayContaining(['workflow_incoming_message', 'workflow_outgoing_message', 'task', 'event', 'gateway', 'error', 'warning', 'restart']),
    );
    const firstTask = (result as any).logs.find((v) => v.type === 'task');
    expect(firstTask.warnings).toHaveLength(1);
    expect(firstTask.details.name).toBe('Task template');
    expect(firstTask.details.document.attachments).toEqual([{ id: 'a' }]);
  });

  it('allows calls without roles and rejects users without the admin role or an unknown workflow', async () => {
    const find = jest.spyOn(models().workflow, 'findById').mockResolvedValue({ ...workflow(), tasks: [], workflowErrors: [] } as any);
    await expect(new WorkflowLoggerService().findById('wf-1', undefined)).resolves.toBeTruthy();
    await expect(new WorkflowLoggerService().findById('wf-1', ['user'])).rejects.toThrow("doesn't have role admin");
    find.mockResolvedValueOnce(undefined as any);
    await expect(new WorkflowLoggerService().findById('wf-1', ['admin'])).rejects.toThrow();
  });
});
