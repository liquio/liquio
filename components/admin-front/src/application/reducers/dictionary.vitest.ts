import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/dictionary';

describe('dictionary reducer', () => {
  it('appends a control and stores its contents keyed by control.key', () => {
    const result = reducer(undefined, {
      type: 'DICTIONARY/LOAD_CONTROL_CONTENTS_SUCCESS',
      request: { key: 'k1', control: 'c1' },
      payload: [{ text: 'a' }]
    });
    expect(result.controls.list).toEqual(['c1']);
    expect(result.controls.map['c1.k1']).toEqual([{ text: 'a' }]);
  });

  it('clears the control list on failure', () => {
    const result = reducer(undefined, { type: 'DICTIONARY/LOAD_CONTROLS_FAIL' });
    expect(result.controls.list).toEqual([]);
  });
});
