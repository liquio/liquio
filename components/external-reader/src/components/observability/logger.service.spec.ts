import { AsyncLocalStorage } from 'async_hooks';

import { LoggerService } from './logger.service';

describe('LoggerService redaction', () => {
  const original = process.env.LOG_DISABLE_DEFAULT_REDACTION;
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    spy.mockRestore();
    if (original === undefined) delete process.env.LOG_DISABLE_DEFAULT_REDACTION;
    else process.env.LOG_DISABLE_DEFAULT_REDACTION = original;
  });

  const run = () => {
    new LoggerService(new AsyncLocalStorage() as any).log('t', {
      password: 'hunter2',
      apiKey: 12345,
      ipn: '1234567890',
      url: 'http://x/?client_secret=abc&a=1',
    });
    return spy.mock.calls.map((c) => String(c[0])).join('');
  };

  it('masks default sensitive keys, any JSON type and query params', () => {
    delete process.env.LOG_DISABLE_DEFAULT_REDACTION;
    const out = run();
    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('12345,');
    expect(out).not.toContain('1234567890');
    expect(out).not.toContain('abc');
    expect(out).toContain('a=1');
  });

  it('keeps only configured keys masked with LOG_DISABLE_DEFAULT_REDACTION=true', () => {
    process.env.LOG_DISABLE_DEFAULT_REDACTION = 'true';
    const out = run();
    expect(out).toContain('hunter2');
    expect(out).not.toContain('1234567890');
  });
});
