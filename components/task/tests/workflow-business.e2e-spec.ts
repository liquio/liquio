import nock from 'nock';

import { TestApp } from './test-app';
import { getBusinesses, getConfig, getModels } from '../src/lib/context';

const ELASTIC = 'http://elastic.test';

// WorkflowBusiness status calculation, timeline, last step label, bpmn schema helpers and the elastic list,
// driven with workflow objects and a nock'ed elastic search.
describe('Workflow business', () => {
  let app: TestApp;
  const workflowBusiness = () => getBusinesses().workflow;

  const steps = [
    { taskTemplateId: 1, label: 'Task step', description: 'Task description' },
    { eventTemplateId: 2, label: 'Event step', description: 'Event description' },
    { taskTemplateId: 3 },
  ];
  const message = (...refs: string[]) => ({ type: 'in', sequences: refs.map((sourceRef) => ({ sourceRef })) });
  const workflowWith = (messages: any[], extra: any = {}) => ({
    id: 'wf-1',
    data: { messages },
    workflowTemplate: { data: { timeline: { steps }, statuses: [] } },
    ...extra,
  });

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
    nock.cleanAll();
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  describe('timeline', () => {
    it('keeps only incoming task and event messages', () => {
      expect(workflowBusiness().getTimelineStepsAndMessages({ data: {}, workflowTemplate: {} })).toBeUndefined();
      const { messages } = workflowBusiness().getTimelineStepsAndMessages(
        workflowWith([message('task-1'), { type: 'out', sequences: [] }, message('other')]),
      );
      expect(messages).toHaveLength(1);
    });

    it('answers the label of the last known step', async () => {
      expect(await workflowBusiness().getLastStepLabel({ data: {}, workflowTemplate: {} })).toEqual({ name: null, description: null });
      const workflow = workflowWith([message('task-1'), { type: 'in', sequences: [] }, message('event-2'), message('task-3'), message('task-99')]);
      expect(await workflowBusiness().getLastStepLabel(workflow)).toEqual({ name: 'Event step', description: 'Event description' });
      expect(await workflowBusiness().getLastStepLabel(workflowWith([message('task-3'), message('task-99')]))).toEqual({
        name: null,
        description: null,
      });
    });

    it('builds the timeline from tasks and events', async () => {
      expect(await workflowBusiness().prepareTimeline({ data: {}, workflowTemplate: {} })).toEqual([]);
      const created = new Date('2026-01-01');
      const workflow = workflowWith([message('task-1'), message('event-2'), message('task-3'), message('task-1'), { type: 'in', sequences: [{}] }], {
        tasks: [{ taskTemplateId: 1, createdAt: created, finishedAt: created }],
        events: [{ eventTemplateId: 2, createdAt: created }],
      });
      const timeline = await workflowBusiness().prepareTimeline(workflow);
      expect(timeline.map((v) => v.type)).toEqual(['task', 'event']);
    });

    it('reads info and entity names of the bpmn schema', async () => {
      expect(await workflowBusiness().getWorkflowInfo({ workflowTemplate: { data: {} } })).toEqual([]);
      expect(await workflowBusiness().getWorkflowInfo({ workflowTemplate: { data: { info: [{ a: 1 }] } } })).toEqual([{ a: 1 }]);
      const xml =
        '<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn2:process id="p"><bpmn2:sequenceFlow id="f" sourceRef="Event_start" targetRef="Task-7"/></bpmn2:process></bpmn2:definitions>';
      expect(await workflowBusiness().getEntityNamesOfBpmnSchema(xml)).toEqual(['Event_start', 'Task-7']);
      expect(await workflowBusiness().hasTaskTemplateIdInBpmnSchema(xml, 7)).toBe(true);
      expect(await workflowBusiness().hasTaskTemplateIdInBpmnSchema(xml, 8)).toBe(false);
    });
  });

  describe('reserve statuses', () => {
    const statusFn = (type = 'doing') => `() => [{ type: "${type}", label: "Label", description: "Text", isStatusesTab: false }]`;
    const withStatuses = (statuses: any[], messages: any[], extra: any = {}) => ({
      id: 'wf-1',
      events: [],
      documents: [],
      data: { messages },
      workflowTemplate: { data: { statuses } },
      ...extra,
    });

    it('takes the last calculated statuses of task and event messages', () => {
      const workflow = withStatuses(
        [
          { taskTemplateId: 1, calculate: statusFn('doing') },
          { eventTemplateId: 2, calculate: statusFn('done') },
          { taskTemplateId: 3 },
          { taskTemplateId: 4, calculate: '() => []' },
        ],
        [
          message('task-1'),
          message('event-2'),
          message('task-3'),
          message('task-4'),
          message('event-9'),
          { type: 'in', sequences: [{ sourceRef: undefined }] },
        ],
      );
      const result = workflowBusiness().calculateReserveStatuses(workflow);
      expect(result[0].type).toBe('done');
      expect(workflowBusiness().calculateReserveStatuses(withStatuses([], []))).toEqual([]);
    });

    it('replaces the front url macro and reports broken functions', () => {
      const config = getConfig();
      config.mapping = { ...config.mapping, taskBusiness: { frontUrl: { template: 'FRONT', replace: 'https://front.example' } } };
      const workflow = withStatuses(
        [{ taskTemplateId: 1, calculate: '() => [{ type: "done", label: "FRONT", description: "x", isStatusesTab: false }]' }],
        [message('task-1')],
      );
      expect(workflowBusiness().calculateReserveStatuses(workflow)[0].label).toBe('https://front.example');
      const eventWorkflow = withStatuses(
        [{ eventTemplateId: 2, calculate: '() => [{ type: "done", label: "FRONT", description: "x" }]' }],
        [message('event-2')],
      );
      expect(workflowBusiness().calculateReserveStatuses(eventWorkflow)[0].label).toBe('https://front.example');
      const broken = withStatuses([{ taskTemplateId: 1, calculate: '() => { throw new Error("x"); }' }], [message('task-1')]);
      expect(() => workflowBusiness().calculateReserveStatuses(broken)).toThrow('workflow.status.calculate');
      const brokenEvent = withStatuses([{ eventTemplateId: 2, calculate: '() => { throw new Error("x"); }' }], [message('event-2')]);
      expect(() => workflowBusiness().calculateReserveStatuses(brokenEvent)).toThrow('workflow.status.calculate');
      config.mapping = { ...config.mapping, taskBusiness: undefined };
    });
  });

  describe('setWorkflowStatus', () => {
    const template = (statuses: any) => ({ id: 1, data: { statuses } });
    const ctx = { documents: [], events: [] };

    it('stores a fixed status id or a calculated status list', async () => {
      const setStatus = jest.spyOn(getModels().workflow, 'setStatus').mockResolvedValue(undefined as any);
      await workflowBusiness().setWorkflowStatus('w', template({}), 1, ctx);
      await workflowBusiness().setWorkflowStatus('w', template([{ taskTemplateId: 1 }]), 1, ctx);
      await workflowBusiness().setWorkflowStatus('w', template([{ taskTemplateId: 2, statusId: 1 }]), 1, ctx);
      expect(setStatus).not.toHaveBeenCalled();
      await workflowBusiness().setWorkflowStatus('w', template([{ taskTemplateId: 1, statusId: 5 }]), 1, ctx);
      expect(setStatus).toHaveBeenLastCalledWith('w', 5);
      for (const [type, id] of [
        ['doing', 1],
        ['done', 2],
        ['rejected', 3],
      ] as any[]) {
        await workflowBusiness().setWorkflowStatus(
          'w',
          template([{ taskTemplateId: 1, calculate: `() => [{ type: "${type}", label: "L", description: "D", isStatusesTab: false }]` }]),
          1,
          ctx,
        );
        expect(setStatus.mock.calls[setStatus.mock.calls.length - 1][1]).toBe(id);
      }
      await workflowBusiness().setWorkflowStatus('w', template([{ taskTemplateId: 1, calculate: '() => []' }]), 1, ctx);
    });

    it('rejects invalid calculated statuses', async () => {
      jest.spyOn(getModels().workflow, 'setStatus').mockResolvedValue(undefined as any);
      const run = (calculate: string) => workflowBusiness().setWorkflowStatus('w', template([{ taskTemplateId: 1, calculate }]), 1, ctx);
      await expect(run('() => [{ type: "unknown", label: "L", description: "D" }]')).rejects.toThrow('Invalid status.');
      await expect(run('() => [{ type: "done", label: "L", description: "D", isStatusesTab: true }]')).rejects.toThrow('Non tabed');
    });
  });

  describe('elastic list', () => {
    const configure = () => {
      getConfig().workflow = {
        ...getConfig().workflow,
        elastic: { protocol: 'http', host: 'elastic.test', uri: '/search', method: 'POST', headers: { a: 'b' }, template: 'workflows' },
      };
    };

    it('maps filters and sort to the search template and parses the hits', async () => {
      configure();
      let sent: any;
      nock(ELASTIC)
        .post('/search', (body) => {
          sent = body;
          return true;
        })
        .reply(200, {
          hits: {
            total: { value: 25 },
            hits: [
              {
                _id: 'w1',
                _source: {
                  id: 'w1',
                  userworkflowTemplate: { id: 5, name: 'T' },
                  logs: [
                    { type: 'workflow_incoming_message', details: JSON.stringify({ sequences: [] }), createdAt: 'a' },
                    { type: 'workflow_outgoing_message', details: JSON.stringify({ x: 1 }), createdAt: 'b' },
                    { type: 'other', details: '{}' },
                  ],
                },
              },
              { _id: 'w2', _source: { userworkflowTemplate: { id: 6 }, logs: [] } },
            ],
          },
        });
      const result = await workflowBusiness().getAllElasticFiltered({
        currentPage: 2,
        perPage: 10,
        sort: { createdAt: 'DESC', unknown: 'asc' },
        filters: { unknown: 'x' },
      });
      expect(sent.id).toBe('workflows');
      expect(sent.params).toMatchObject({ selected_size: 10, selected_from: 10 });
      expect(result.pagination).toEqual({ total: 25, currentPage: 2, perPage: 10, lastPage: 3 });
      expect(result.data[0]).toMatchObject({ id: 'w1', workflowTemplateId: 5 });
      expect(result.data[0].data.messages.map((v) => v.type)).toEqual(['in', 'out']);
      expect(result.data[1].data.messages).toBeUndefined();
    });

    it('uses the default sort without params', async () => {
      configure();
      let sent: any;
      nock(ELASTIC)
        .post('/search', (body) => {
          sent = body;
          return true;
        })
        .reply(200, { hits: { total: { value: 0 }, hits: [] } });
      const result = await workflowBusiness().getAllElasticFiltered({ currentPage: 1, perPage: 5 });
      expect(sent.params.selected_sort_createdAt).toBe('desc');
      expect(result.pagination.lastPage).toBe(1);
    });
  });
});
