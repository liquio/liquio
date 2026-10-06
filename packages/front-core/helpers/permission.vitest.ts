import { describe, expect, it } from 'vitest';
import getPermission, { getPermText } from 'helpers/permission';

describe('getPermission', () => {
  it('finds the highest allowed non-share permission', () => {
    expect(getPermission({ allowCommit: 1 }).name).toBe('allowCommit');
  });

  it('defaults to allowRead when nothing is set', () => {
    expect(getPermission({}).name).toBe('allowRead');
  });
});

describe('getPermText', () => {
  it('appends the share abbreviation when sharing is allowed', () => {
    const t = (key: string) => key;
    expect(getPermText(t, { allowEdit: 1, allowShare: 1 })).toBe('ABBR_PERMISSION_2ABBR_PERMISSION_4');
    expect(getPermText(t, { allowEdit: 1 })).toBe('ABBR_PERMISSION_2');
  });
});
