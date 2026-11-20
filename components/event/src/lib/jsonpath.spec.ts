import { JSONPath } from './jsonpath';

jest.mock('./context', () => ({
  getLog: () => ({ save: jest.fn() }),
}));

describe('JSONPath', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns results and unrefs the cache expiry timer', () => {
    const unref = jest.fn();
    const spy = jest.spyOn(global, 'setTimeout').mockImplementation((() => ({ unref })) as any);
    const result = JSONPath({ path: '$..[?(@.a === "x")]', json: [{ a: 'x' }, { a: 'y' }] });
    expect(result).toEqual([{ a: 'x' }]);
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 10000);
    expect(unref).toHaveBeenCalled();
  });
});
