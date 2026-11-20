import { ConsoleLogProvider } from './console';

describe('ConsoleLogProvider', () => {
  const timestamp = 1700000000000;

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.LOG_DISABLE_DEFAULT_REDACTION;
  });

  it('masks default sensitive fields without any config', async () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await new ConsoleLogProvider().save(
      timestamp,
      'test-type',
      { headers: { Authorization: 'Bearer abc' }, access_token: 'TOKVAL', url: 'http://h/?client_secret=cs' },
      'log-id',
      {},
      'info',
      undefined,
      undefined,
    );

    const written = writeSpy.mock.calls[0][0] as string;
    ['abc', 'TOKVAL'].forEach((v) => expect(written).not.toContain(v));
    expect(written).not.toContain('client_secret=cs');
  });

  it('keeps defaults off when disableDefaultRedaction is set, still masking configured keys', async () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const provider = new ConsoleLogProvider('console', { disableDefaultRedaction: true, excludeParams: ['custom'] });

    await provider.save(timestamp, 'test-type', { password: 'visible', custom: 'hidden' }, 'log-id', {}, 'info', undefined, undefined);

    const written = writeSpy.mock.calls[0][0] as string;
    expect(written).toContain('visible');
    expect(written).not.toContain('hidden');
  });

  it('honours LOG_DISABLE_DEFAULT_REDACTION=true', async () => {
    process.env.LOG_DISABLE_DEFAULT_REDACTION = 'true';
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await new ConsoleLogProvider().save(timestamp, 'test-type', { password: 'visible' }, 'log-id', {}, 'info', undefined, undefined);

    expect(writeSpy.mock.calls[0][0] as string).toContain('visible');
  });
});
