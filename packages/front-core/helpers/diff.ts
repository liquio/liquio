import diff, { Diff } from 'deep-diff';

export const applyDiffs = (diffs: Diff[] = [], target: unknown): void =>
  diffs.forEach((d) => diff.applyChange(target, null, d));

export default (left: unknown = {}, right: unknown = {}): Diff[] | undefined => diff(left, right);
