import { describe, expect, it } from 'vitest';
import diff, { applyDiffs } from 'helpers/diff';

describe('diff', () => {
  it('reports differences between two objects', () => {
    const changes = diff({ a: 1 }, { a: 2 });
    expect(changes).toHaveLength(1);
    expect(changes?.[0]).toMatchObject({ kind: 'E', path: ['a'], lhs: 1, rhs: 2 });
  });

  it('returns undefined for equal objects', () => {
    expect(diff({ a: 1 }, { a: 1 })).toBeUndefined();
  });
});

describe('applyDiffs', () => {
  // deep-diff's applyChange requires the original "left" object as its source argument;
  // this helper always passes null, so it is a no-op as currently written (dead/unused code,
  // preserved as-is rather than fixed).
  it('is a no-op as currently implemented, since it always passes a null source', () => {
    const target = { a: 1 };
    const changes = diff({ a: 1 }, { a: 2 }) ?? [];
    applyDiffs(changes, target);
    expect(target).toEqual({ a: 1 });
  });
});
