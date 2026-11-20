import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/workflowProcess';

describe('workflowProcess reducer', () => {
  it('stores a process by id under list', () => {
    const result = reducer(undefined, { type: 'REQUEST_WORKFLOW_PROCESS_SUCCESS', request: { processId: 7 }, payload: { id: 7 } });
    expect(result.list[7]).toEqual({ id: 7 });
  });

  it('stores a decoded attach by id', () => {
    const result = reducer(undefined, { type: 'REQUEST_WORKFLOW_PROCESS_ATTACH_DECODED', id: 'att-1', payload: 'decoded' });
    expect(result.attaches['att-1']).toBe('decoded');
  });
});
