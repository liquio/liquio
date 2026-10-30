import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/externalReader';

describe('externalReader reducer', () => {
  it('stores captcha from the register reader list', () => {
    const result = reducer(undefined, {
      type: 'GET_DATA_EXTERNAL_REGISTER_READER_LIST_SUCCESS',
      payload: { image: 'abc' }
    });
    expect(result.captcha).toEqual({ image: 'abc' });
  });

  it('keys external data by the stringified requestData', () => {
    const requestData = { foo: 'bar' };
    const result = reducer(undefined, {
      type: 'REQUEST_EXTERNAL_DATA_SUCCESS',
      request: { requestData },
      payload: { ok: true }
    });
    expect(result[JSON.stringify(requestData)]).toEqual({ ok: true });
  });
});
