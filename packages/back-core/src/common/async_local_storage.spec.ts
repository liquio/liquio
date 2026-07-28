import { asyncLocalStorageMiddleware, runInAsyncLocalStorage, getTraceId, getTraceMeta, appendTraceMeta } from './async_local_storage';

describe('async_local_storage', () => {
  it('returns no trace outside of a storage context', () => {
    expect(getTraceId()).toBeUndefined();
    expect(getTraceMeta()).toBeUndefined();
  });

  it('generates a trace id and empty trace meta inside runInAsyncLocalStorage', () => {
    expect.assertions(2);

    runInAsyncLocalStorage(() => {
      expect(getTraceId()).toEqual(expect.any(String));
      expect(getTraceMeta()).toEqual({});
    });
  });

  it('appends trace meta inside the storage context', () => {
    expect.assertions(1);

    runInAsyncLocalStorage(() => {
      appendTraceMeta({ workflowId: 'wf-1' });
      appendTraceMeta({ taskId: 'task-1' });

      expect(getTraceMeta()).toEqual({ workflowId: 'wf-1', taskId: 'task-1' });
    });
  });

  it('does nothing when appendTraceMeta is called outside of a storage context', () => {
    expect(() => appendTraceMeta({ foo: 'bar' })).not.toThrow();
  });

  it('middleware sets the x-trace-id header and exposes it via getTraceId', () => {
    expect.assertions(1);

    const req: any = { headers: {} };
    const res: any = { set: jest.fn() };

    asyncLocalStorageMiddleware(req, res, () => {
      expect(res.set).toHaveBeenCalledWith('x-trace-id', getTraceId());
    });
  });

  it('middleware reuses an incoming x-trace-id header', () => {
    expect.assertions(2);

    const req: any = { headers: { 'x-trace-id': 'incoming-trace-id' } };
    const res: any = { set: jest.fn() };

    asyncLocalStorageMiddleware(req, res, () => {
      expect(getTraceId()).toBe('incoming-trace-id');
    });

    expect(res.set).toHaveBeenCalledWith('x-trace-id', 'incoming-trace-id');
  });
});
