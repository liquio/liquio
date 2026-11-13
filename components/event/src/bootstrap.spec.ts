import { EventEmitter } from 'node:events';

import { App } from './bootstrap';
import { setAppContext } from './lib/context';

describe('App.useGracefulShutdown', () => {
  it('stops the daemon, then http, then drains the bus, exits once and ignores a second signal', async () => {
    setAppContext({ config: { message_queue: {} }, log: { save: jest.fn() } });
    const order: string[] = [];
    const app: any = Object.create(App.prototype);
    app.config = { message_queue: {} };
    app.eventBusiness = { stopDaemon: jest.fn(async () => void order.push('daemon')) };
    app.routerService = { stop: jest.fn(async () => void order.push('http')) };
    app.messageBus = { close: jest.fn(async () => void order.push('bus')) };
    const emitter = new EventEmitter();
    const exit = jest.fn();

    app.useGracefulShutdown({ processLike: emitter, exit });
    emitter.emit('SIGTERM');
    emitter.emit('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(order).toEqual(['daemon', 'http', 'bus']);
    expect(app.messageBus.close).toHaveBeenCalledWith({ drainTimeoutMs: 25000 });
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
