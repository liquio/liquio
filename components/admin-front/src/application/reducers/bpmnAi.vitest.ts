import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/bpmnAi';

describe('bpmnAi reducer', () => {
  it('stores the external command', () => {
    expect(reducer(undefined, { type: 'AI_SET_EXTERNAL_COMMAND', payload: 'do-thing' })).toEqual({ externalCommand: 'do-thing' });
  });

  it('returns state unchanged for other actions', () => {
    const state = { externalCommand: 'x' };
    expect(reducer(state, { type: 'OTHER' })).toBe(state);
  });
});
