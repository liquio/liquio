import { ConsoleLogProvider } from './console';

describe('ConsoleLogProvider', () => {
  const timestamp = 1700000000000;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes info logs to stdout as JSON', async () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const provider = new ConsoleLogProvider();

    await provider.save(timestamp, 'test-type', { foo: 'bar' }, 'log-id', { name: 'app' }, 'info', 'trace-id', { meta: 1 });

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const written = JSON.parse((writeSpy.mock.calls[0][0] as string).trim());
    expect(written).toMatchObject({
      type: 'test-type',
      data: { foo: 'bar' },
      logId: 'log-id',
      appInfo: { name: 'app' },
      level: 'info',
      traceId: 'trace-id',
      traceMeta: { meta: 1 },
    });
  });

  it('writes warning and error logs to stderr', async () => {
    const errSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const provider = new ConsoleLogProvider();

    await provider.save(timestamp, 'test-type', {}, 'log-id', {}, 'warning');
    await provider.save(timestamp, 'test-type', {}, 'log-id', {}, 'error');

    expect(errSpy).toHaveBeenCalledTimes(2);
  });

  it('masks configured sensitive fields', async () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const provider = new ConsoleLogProvider('console', { excludeParams: ['password'] });

    await provider.save(timestamp, 'test-type', { password: 'secret' }, 'log-id', {}, 'info');

    const written = writeSpy.mock.calls[0][0] as string;
    expect(written).not.toContain('secret');
    expect(written).toContain('****');
  });

  it('truncates oversized log data before writing', async () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const provider = new ConsoleLogProvider();

    await provider.save(timestamp, 'test-type', { huge: 'x'.repeat(200000) }, 'log-id', {}, 'info');

    const written = JSON.parse((writeSpy.mock.calls[0][0] as string).trim());
    expect(JSON.stringify(written).length).toBeLessThan(200000);
  });

  it('logs a length error instead of writing when the envelope is still too long after truncating data', async () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const provider = new ConsoleLogProvider();

    // "data" gets truncated by cutLongStrings, but "appInfo" does not, so an oversized
    // appInfo alone is enough to push the serialized envelope past MAX_LOG_LENGTH.
    await provider.save(timestamp, 'test-type', { foo: 'bar' }, 'log-id', { huge: 'x'.repeat(200000) }, 'info');

    expect(writeSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const errorPayload = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(errorPayload.type).toBe('log-too-long-error');
  });
});
