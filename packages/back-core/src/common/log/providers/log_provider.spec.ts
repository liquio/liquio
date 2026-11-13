import { LogProvider } from './log_provider';

describe('LogProvider', () => {
  it('exposes the given name', () => {
    const provider = new LogProvider('custom');

    expect(provider.name).toBe('custom');
  });

  it('throws when save is not overridden by a subclass', async () => {
    const provider = new LogProvider('custom');
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(provider.save('timestamp', 'type', 'data', 'log-id', {}, 'info', 'trace-id', {})).rejects.toThrow(
      'Save method not defined in current log provider.',
    );
  });
});
