import diff from 'deep-diff';

export const applyDiffs = (diffs = [], target) =>
  diffs.forEach((d) => diff.applyChange(target, null, d));

export default (left = {}, right = {}) => diff(left, right);
