import { BPMN_MESSAGE_LOG_FIELDS, bpmnMessageLogContext, withBpmnLogContext } from './log_fields';

const EXCLUDED = {
  initData: { secret: 'SENTINEL' },
  unitIds: [1],
  performerUnits: [1],
  requiredPerformerUnits: [1],
  performerUsers: ['SENTINEL'],
  performerUsersIpn: 'SENTINEL',
  performerUsersEmail: ['SENTINEL@example.test'],
  files: ['SENTINEL'],
  fileContent: 'SENTINEL',
  sequenceIds: [1],
  type: 'SENTINEL',
  data: { a: 'SENTINEL' },
  extra: 'SENTINEL',
};

describe('bpmn message log fields', () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    [
      'manager',
      {
        workflowId: 'w',
        taskId: 't',
        gatewayId: 'g',
        eventId: 'e',
        forwardToTask: 'f',
        workflowTemplateId: 1,
        taskTemplateId: 2,
        createWorkflowId: 'c',
        workflowParentId: 'p',
        retryIterator: 3,
        onlyExecute: true,
        debugId: 'd',
        userId: 'u',
      },
    ],
    [
      'task',
      {
        workflowId: 'w',
        workflowTemplateId: 1,
        taskTemplateId: 2,
        createWorkflowId: 'c',
        workflowParentId: 'p',
        forwardToTask: 'f',
        retryIterator: 3,
        onlyExecute: true,
        isCreateByOtherSystem: true,
        debugId: 'd',
        userId: 'u',
      },
    ],
    ['gateway', { workflowId: 'w', workflowTemplateId: 1, gatewayTemplateId: 2, retryIterator: 3, debugId: 'd', userId: 'u' }],
    ['event', { workflowId: 'w', workflowTemplateId: 1, eventTemplateId: 2, retryIterator: 3, onlyExecute: false, debugId: 'd', userId: 'u' }],
    ['task-pdf', { documentId: 'doc', userId: 'u' }],
    ['task-delayed-auto-commit', { taskId: 't' }],
  ];

  it.each(cases)('%s yields exactly the listed fields', (destination, safe) => {
    expect(Object.keys(safe).sort()).toEqual([...BPMN_MESSAGE_LOG_FIELDS[destination]].sort());
    const result = bpmnMessageLogContext(destination)({ ...EXCLUDED, ...safe, debug: { a: 1 } });
    expect(result).toEqual(safe);
    expect(JSON.stringify(result)).not.toContain('SENTINEL');
  });

  it('uses the event list for event.<key>', () => {
    expect(bpmnMessageLogContext('event.special')({ workflowId: 'w', eventTemplateId: 1, taskId: 't' })).toEqual({
      workflowId: 'w',
      eventTemplateId: 1,
    });
  });

  it('yields nothing for an unknown destination', () => {
    expect(bpmnMessageLogContext('other')({ workflowId: 'w' })).toEqual({});
  });

  it('withBpmnLogContext keeps an existing extractor', () => {
    const own = () => ({ x: 1 });
    const result = withBpmnLogContext({ manager: { address: 'm' }, task: { address: 't', logContext: own } });
    expect(result.task.logContext).toBe(own);
    expect(result.manager.logContext?.({ workflowId: 'w', initData: 'x' })).toEqual({ workflowId: 'w' });
  });
});
