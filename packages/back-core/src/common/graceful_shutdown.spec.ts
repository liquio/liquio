import { EventEmitter } from 'node:events';

import { registerGracefulShutdown } from './graceful_shutdown';

describe('registerGracefulShutdown', () => {
  let emitter: EventEmitter;
  let exit: jest.Mock;
  let save: jest.Mock;
  let unregister: (() => void) | undefined;
  const getLog = () => ({ save });

  beforeEach(() => {
    jest.useFakeTimers();
    emitter = new EventEmitter();
    exit = jest.fn();
    save = jest.fn();
  });

  afterEach(() => {
    unregister?.();
    unregister = undefined;
    jest.useRealTimers();
  });

  it('runs steps in order, exits once and ignores later signals', async () => {
    const order: string[] = [];
    unregister = registerGracefulShutdown({
      getLog,
      processLike: emitter,
      exit,
      steps: [
        { name: 'a', run: () => void order.push('a') },
        { name: 'b', run: async () => void order.push('b') },
      ],
    });
    emitter.emit('SIGTERM');
    emitter.emit('SIGINT');
    await jest.advanceTimersByTimeAsync(0);
    expect(order).toEqual(['a', 'b']);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(save.mock.calls.map((c) => c[0])).toEqual(['app-stopping', 'app-stopped']);
  });

  it('logs a failing step by name and code only and continues', async () => {
    const ran = jest.fn();
    unregister = registerGracefulShutdown({
      getLog,
      processLike: emitter,
      exit,
      steps: [
        {
          name: 'bad',
          run: () => {
            throw Object.assign(new Error('SENTINEL-7'), { code: 'E_X' });
          },
        },
        { name: 'next', run: ran },
      ],
    });
    emitter.emit('SIGTERM');
    await jest.advanceTimersByTimeAsync(0);
    expect(ran).toHaveBeenCalled();
    const entry = save.mock.calls.find((c) => c[0] === 'app-stop-step-error');
    expect(entry[1]).toEqual({ step: 'bad', error: { name: 'Error', code: 'E_X' } });
    expect(JSON.stringify(save.mock.calls)).not.toContain('SENTINEL-7');
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('forces exit when a step hangs', async () => {
    unregister = registerGracefulShutdown({
      getLog,
      processLike: emitter,
      exit,
      forceExitAfterMs: 1000,
      exitCode: 2,
      steps: [{ name: 'hang', run: () => new Promise<void>(() => undefined) }],
    });
    emitter.emit('SIGTERM');
    await jest.advanceTimersByTimeAsync(999);
    expect(exit).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(2);
    expect(exit).toHaveBeenCalledWith(2);
    expect(save.mock.calls.map((c) => c[0])).toContain('app-stop-timeout');
  });

  it('throws on double registration and unregister removes listeners', () => {
    unregister = registerGracefulShutdown({ getLog, processLike: emitter, exit, steps: [] });
    expect(() => registerGracefulShutdown({ getLog, processLike: emitter, exit, steps: [] })).toThrow();
    unregister();
    unregister = undefined;
    expect(emitter.listenerCount('SIGTERM')).toBe(0);
    expect(emitter.listenerCount('SIGINT')).toBe(0);
    unregister = registerGracefulShutdown({ getLog, processLike: emitter, exit, steps: [] });
  });
});
