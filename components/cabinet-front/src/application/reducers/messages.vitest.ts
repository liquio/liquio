import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/messages';

describe('messages reducer', () => {
  it('ignores the dataTable GET_LIST_SUCCESS action when it has no meta', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    const result = reducer(state, {
      type: 'DATA_TABLE/MESSAGESLIST/GET_LIST_SUCCESS',
      payload: { data: [] }
    });
    expect(result).toBe(state);
  });

  it('sets unreadCount from the dataTable GET_LIST_SUCCESS meta', () => {
    const result = reducer(undefined, {
      type: 'DATA_TABLE/MESSAGESLIST/GET_LIST_SUCCESS',
      payload: { meta: { unread: 3 } }
    });
    expect(result.unreadCount).toBe(3);
  });

  it('sets the viewed message list', () => {
    const result = reducer(undefined, { type: 'GET_VIEWED_MESSAGE_LIST', payload: [1, 2] });
    expect(result.viewedList).toEqual([1, 2]);
  });
});
