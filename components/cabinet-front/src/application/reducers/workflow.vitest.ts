import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/workflow';

describe('workflow reducer (cabinet-front)', () => {
  it('stores a loaded workflow under both actual and a deep-cloned origin', () => {
    const workflow = { id: 1, name: 'a' };
    const result = reducer(undefined, { type: 'LOAD_WORKFLOW_SUCCESS', payload: workflow });
    expect(result.actual[1]).toBe(workflow);
    expect(result.origin[1]).toEqual(workflow);
    expect(result.origin[1]).not.toBe(workflow);
  });

  it('stores workflow logs keyed by workflowId', () => {
    const result = reducer(undefined, {
      type: 'LOAD_WORKFLOW_LOGS_SUCCESS',
      payload: { workflowId: 1, logs: ['a'] }
    });
    expect(result.logs[1]).toEqual(['a']);
  });
});
