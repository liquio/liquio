import { describe, expect, it, vi } from 'vitest';
import endPoint from 'application/endPoints/users';

// This endpoint's actions import application/actions/users, which pulls in the real Redux store
// (and circularly, application/reducers, which imports this very endpoint module). Stub the
// actions so this suite only exercises the endpoint's own mapData/getDataUrl/reduce functions.
vi.mock('application/actions/users', () => ({
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  setAdmin: vi.fn(),
  unsetAdmin: vi.fn()
}));

describe('users endpoint mapData', () => {
  it('renames userId to id and reports the page/count', () => {
    const result = endPoint.mapData!([{ userId: 1, name: 'a' }], { page: 2 });
    expect(result).toEqual({ data: [{ id: 1, name: 'a' }], page: 2, count: undefined });
  });
});

describe('users endpoint getDataUrl', () => {
  it('includes only the filters that are actually set', () => {
    const url = endPoint.getDataUrl!('users', { rowsPerPage: 10, filters: { name: 'jane' } });
    expect(url).toContain('search=jane');
    expect(url).not.toContain('ipn=');
  });
});

describe('users endpoint reduce', () => {
  it('marks the matching user inactive on BLOCK_USER_SUCCESS', () => {
    const state = { data: [{ id: 1, isActive: true }] } as never;
    const result = endPoint.reduce!(state, { type: 'USERS/BLOCK_USER_SUCCESS', request: { userId: 1 } });
    expect(result.data).toEqual([{ id: 1, isActive: false }]);
  });

  it('leaves state unchanged for unrelated action types', () => {
    const state = { data: [{ id: 1, isActive: true }] } as never;
    expect(endPoint.reduce!(state, { type: 'SOMETHING_ELSE' })).toBe(state);
  });
});
