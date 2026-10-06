import { describe, expect, it } from 'vitest';
import userHeadUnitList from 'helpers/userHeadUnitList';

describe('userHeadUnitList', () => {
  it('returns head units that are not based on another unit', () => {
    const units = [
      { id: 1, head: true, basedOn: [2] },
      { id: 2, head: true, basedOn: [] as number[] },
      { id: 3, head: false, basedOn: [] as number[] }
    ];
    expect(userHeadUnitList(units)).toEqual([units[0]]);
  });

  it('defaults to an empty list', () => {
    expect(userHeadUnitList()).toEqual([]);
  });
});
