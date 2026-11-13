import { EventEmitter } from 'node:events';

// The shared shutdown registration is once per module instance, so each test loads fresh modules.
function load() {
  let shutdown: typeof import('./shutdown');
  let context: typeof import('./context');
  jest.isolateModules(() => {
    shutdown = require('./shutdown');
    context = require('./context');
  });
  return { registerShutdown: shutdown!.registerShutdown, setAppContext: context!.setAppContext };
}

describe('registerShutdown', () => {
  it('stops the core once on SIGTERM with the configured drain timeout, exits with 1 and ignores a second signal', async () => {
    const { registerShutdown, setAppContext } = load();
    setAppContext({ log: { save: jest.fn() } as any, config: { message_queue: { shutdownDrainTimeoutMs: 1234 } } });
    const emitter = new EventEmitter();
    const exit = jest.fn();
    const stop = jest.fn().mockResolvedValue(undefined);
    registerShutdown({ core: { stop } }, { processLike: emitter, exit });

    emitter.emit('SIGTERM');
    emitter.emit('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(stop).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledWith(1234);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('defaults the drain timeout to 25 seconds', async () => {
    const { registerShutdown, setAppContext } = load();
    setAppContext({ log: { save: jest.fn() } as any, config: {} });
    const emitter = new EventEmitter();
    const stop = jest.fn().mockResolvedValue(undefined);
    registerShutdown({ core: { stop } }, { processLike: emitter, exit: jest.fn() });

    emitter.emit('SIGINT');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(stop).toHaveBeenCalledWith(25000);
  });
});
