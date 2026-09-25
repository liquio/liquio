import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/events';

describe('events reducer', () => {
  it('stringifies jsonSchema when storing a requested event', () => {
    const result = reducer(undefined, {
      type: 'EVENTS/REQUEST_EVENT_SUCCESS',
      request: { eventId: 'e1' },
      payload: { id: 'e1', jsonSchema: { type: 'object' } }
    });
    expect(typeof result.actual.e1?.jsonSchema).toBe('string');
  });

  it('ignores ELEMENT_CHANGED for element types outside the event set', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    const result = reducer(state, { type: 'WORKFLOW/ELEMENT_CHANGED', payload: { type: 'bpmn:Task', businessObject: { id: 'x-1' } } });
    expect(result).toBe(state);
  });
});
