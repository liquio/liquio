import { EventEmitter } from 'node:events';

import { setAppContext } from './context';
import { registerShutdown } from './shutdown';

describe('registerShutdown', () => {
  it('stops http, then closes the bus, exits once and ignores a second signal', async () => {
    setAppContext({ config: { message_queue: {} }, log: { save: jest.fn() } });
    const order: string[] = [];
    const routerService = { stop: jest.fn(async () => void order.push('http')) };
    const messageBus = { close: jest.fn(async () => void order.push('bus')) };
    const emitter = new EventEmitter();
    const exit = jest.fn();

    registerShutdown({ routerService, messageBus } as any, { processLike: emitter, exit });
    emitter.emit('SIGTERM');
    emitter.emit('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(order).toEqual(['http', 'bus']);
    expect(messageBus.close).toHaveBeenCalledWith({ drainTimeoutMs: 25000 });
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
