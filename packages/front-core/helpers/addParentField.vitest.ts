import { describe, expect, it } from 'vitest';
import addParentField from 'helpers/addParentField';

describe('addParentField', () => {
  it('fills in missing intermediate objects along the path', () => {
    const data: Record<string, unknown> = {};
    addParentField('a.b.c', data);
    expect(data).toEqual({ a: { b: {} } });
  });

  it('does nothing for an empty path', () => {
    const data = { a: 1 };
    addParentField(undefined, data);
    expect(data).toEqual({ a: 1 });
  });
});
