import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/inbox';

describe('inbox reducer', () => {
  it('stores the unread inbox count', () => {
    const result = reducer(undefined, { type: 'GET_UNREAD_INBOX_COUNT_SUCCESS', payload: 5 });
    expect(result.unreadCount).toBe(5);
  });
});
