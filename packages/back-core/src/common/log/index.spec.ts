import { Log } from './index';
import { LogProvider } from './providers/log_provider';

class FakeProvider extends LogProvider {
  public calls: unknown[][] = [];

  async save(...args: unknown[]) {
    this.calls.push(args);
  }
}

describe('Log', () => {
  it('throws when constructed with a non LogProvider instance', () => {
    expect(() => new Log([{} as any], [])).toThrow('Wrong provider.');
  });
});

describe('Log (singleton instance)', () => {
  const active = new FakeProvider('active');
  const inactive = new FakeProvider('inactive');
  let log: Log;

  beforeAll(() => {
    log = new Log([active, inactive], ['active']);
  });

  it('acts as a singleton regardless of later constructor args', () => {
    const other = new Log([], []);

    expect(other).toBe(log);
  });

  it('exposes the known log levels', () => {
    expect(log.Levels).toEqual({ INFO_LEVEL: 'info', WARNING_LEVEL: 'warning', ERROR_LEVEL: 'error' });
  });

  it('only saves via providers whose name is in the active list', async () => {
    await log.save('test-type', { foo: 'bar' });
    await Promise.resolve();

    expect(active.calls).toHaveLength(1);
    expect(inactive.calls).toHaveLength(0);
    expect(active.calls[0][1]).toBe('test-type');
    expect(active.calls[0][2]).toEqual({ foo: 'bar' });
  });

  it('rejects when addProvider is given a non LogProvider instance', () => {
    expect(() => log.addProvider({} as any)).toThrow('Wrong provider.');
  });

  it('dispatches to providers added via addProvider', async () => {
    const extra = new FakeProvider('active');
    log.addProvider(extra);
    active.calls.length = 0;

    await log.save('another-type');
    await Promise.resolve();

    expect(active.calls).toHaveLength(1);
    expect(extra.calls).toHaveLength(1);
  });

  it('does not save logs when DISABLE_LOG is set', async () => {
    active.calls.length = 0;
    process.env.DISABLE_LOG = '1';

    try {
      const logId = await log.save('skipped-type');
      expect(logId).toBeNull();
    } finally {
      delete process.env.DISABLE_LOG;
    }

    await Promise.resolve();
    expect(active.calls).toHaveLength(0);
  });
});
