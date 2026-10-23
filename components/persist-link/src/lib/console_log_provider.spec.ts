import { ConsoleLogProvider } from '@liquio/back-core';

import { createConsoleLogProvider } from './console_log_provider';

jest.mock('@liquio/back-core', () => ({ ConsoleLogProvider: jest.fn() }));

describe('createConsoleLogProvider', () => {
  beforeEach(() => (ConsoleLogProvider as unknown as jest.Mock).mockClear());

  it('does not disable default redaction without config (back-core defaults apply)', () => {
    createConsoleLogProvider(undefined);
    const [, options] = (ConsoleLogProvider as unknown as jest.Mock).mock.calls[0];
    expect(options.disableDefaultRedaction).toBe(false);
    expect(options.excludeParams).toBeUndefined();
  });

  it('passes log.disableDefaultRedaction=true and configured excludeParams', () => {
    createConsoleLogProvider({ console: { name: 'c' }, excludeParams: ['x'], disableDefaultRedaction: true });
    expect((ConsoleLogProvider as unknown as jest.Mock).mock.calls[0]).toEqual(['c', { excludeParams: ['x'], disableDefaultRedaction: true }]);
  });

  it('treats non-boolean-true values as not disabled', () => {
    createConsoleLogProvider({ disableDefaultRedaction: 'true' });
    expect((ConsoleLogProvider as unknown as jest.Mock).mock.calls[0][1].disableDefaultRedaction).toBe(false);
  });
});
