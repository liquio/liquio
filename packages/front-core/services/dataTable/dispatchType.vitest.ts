import { describe, expect, it } from 'vitest';
import dispatchType from 'services/dataTable/dispatchType';

describe('dispatchType', () => {
  it('builds a namespaced, upper-cased action type', () => {
    expect(dispatchType('userList', 'GET_LIST')).toBe('DATA_TABLE/USERLIST/GET_LIST');
  });

  it('omits the type segment when none is given', () => {
    expect(dispatchType('userList')).toBe('DATA_TABLE/USERLIST');
  });
});
