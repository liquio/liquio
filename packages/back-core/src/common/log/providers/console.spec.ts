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

  it('masks default sensitive fields without any config', async () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const provider = new ConsoleLogProvider();

    await provider.save(
      timestamp,
      'test-type',
      { headers: { Authorization: 'Bearer abc' }, access_token: 'TOKVAL', url: 'http://h/?client_secret=cs' },
      'log-id',
      {},
      'info',
    );

    const written = writeSpy.mock.calls[0][0] as string;
    ['abc', 'TOKVAL'].forEach((v) => expect(written).not.toContain(v));
    expect(written).not.toContain('client_secret=cs');
  });

  it('keeps default sensitive fields when disableDefaultRedaction is set, still masking configured ones', async () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const provider = new ConsoleLogProvider('console', { disableDefaultRedaction: true, excludeParams: ['custom'] });

    await provider.save(timestamp, 'test-type', { password: 'visible', custom: 'hidden' }, 'log-id', {}, 'info');

    const written = writeSpy.mock.calls[0][0] as string;
    expect(written).toContain('visible');
    expect(written).not.toContain('hidden');
  });

  it('honours LOG_DISABLE_DEFAULT_REDACTION=true', async () => {
    process.env.LOG_DISABLE_DEFAULT_REDACTION = 'true';
    try {
      const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      await new ConsoleLogProvider().save(timestamp, 'test-type', { password: 'visible' }, 'log-id', {}, 'info');

      expect(writeSpy.mock.calls[0][0] as string).toContain('visible');
    } finally {
      delete process.env.LOG_DISABLE_DEFAULT_REDACTION;
    }
  });

  it('truncates oversized log data before writing', async () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const provider = new ConsoleLogProvider();

    await provider.save(timestamp, 'test-type', { huge: 'x'.repeat(200000) }, 'log-id', {}, 'info');

    const written = JSON.parse((writeSpy.mock.calls[0][0] as string).trim());
    expect(JSON.stringify(written).length).toBeLessThan(200000);
  });

  it('logs a length error instead of writing when the envelope is still too long after truncating data', async () => {
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const provider = new ConsoleLogProvider();

    // "data" gets truncated by cutLongStrings, but "appInfo" does not, so an oversized
    // appInfo alone is enough to push the serialized envelope past MAX_LOG_LENGTH.
    await provider.save(timestamp, 'test-type', { foo: 'bar' }, 'log-id', { huge: 'x'.repeat(200000) }, 'info');

    expect(stdoutSpy).not.toHaveBeenCalled();
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const errorPayload = JSON.parse(stderrSpy.mock.calls[0][0] as string);
    expect(errorPayload.type).toBe('log-too-long-error');
  });
});
