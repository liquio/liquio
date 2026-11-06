import '@lib/log';
import { ConsoleLogger } from './console-logger.provider';

describe('ConsoleLogger redaction', () => {
  const original = process.env.LOG_DISABLE_DEFAULT_REDACTION;
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    spy.mockRestore();
    if (original === undefined) delete process.env.LOG_DISABLE_DEFAULT_REDACTION;
    else process.env.LOG_DISABLE_DEFAULT_REDACTION = original;
  });

  it('masks default sensitive keys and query params', () => {
    delete process.env.LOG_DISABLE_DEFAULT_REDACTION;
    new ConsoleLogger().save('t', { password: 'hunter2', apiKey: 12345, url: 'http://x/?client_secret=abc&a=1' });
    const out = spy.mock.calls[0][0] as string;
    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('12345');
    expect(out).not.toContain('abc');
    expect(out).toContain('a=1');
  });

  it('keeps legacy configured keys masked when defaults are disabled', () => {
    process.env.LOG_DISABLE_DEFAULT_REDACTION = 'true';
    new ConsoleLogger().save('t', { password: 'hunter2', token: 'tok' });
    const out = spy.mock.calls[0][0] as string;
    expect(out).toContain('hunter2');
    expect(out).not.toContain('tok"');
  });
});
