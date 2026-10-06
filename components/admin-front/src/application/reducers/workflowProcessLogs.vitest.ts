import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/workflowProcessLogs';

describe('workflowProcessLogs reducer', () => {
  it('stores logs by workflowId', () => {
    const logs = [{ type: 'task', details: { id: 't1' } }];
    const result = reducer(undefined, { type: 'REQUEST_WORKFLOW_PROCESS_LOGS_SUCCESS', payload: { workflowId: 'wf1', logs } });
    expect(result.wf1).toBe(logs);
  });

  it('merges task update data into the matching log entry', () => {
    const initial = {
      wf1: [{ type: 'task', details: { id: 't1', document: { task: {} } } }, { type: 'task', details: { id: 't2' } }]
    };
    const result = reducer(initial, {
      type: 'UPDATE_WORKFLOW_PROCESS_TASK_SUCCESS',
      request: { processId: 'wf1', taskId: 't1', taskData: { finished: true, document: { name: 'x' } } }
    });
    expect(result.wf1[0].details.finished).toBe(true);
    expect(result.wf1[1]).toBe(initial.wf1[1]);
  });
});
