import { setAppContext } from './context';
import { createAdminApiMessageBus, DESTINATION_BY_QUEUE_NAME } from './message_bus';

describe('message bus', () => {
  const config = {
    message_queue: {
      provider: 'memory',
      writingQueueManager: 'to-manager',
      writingQueueTask: 'to-task',
      writingQueueEvent: 'to-event',
      writingQueueGateway: 'to-gateway',
    },
  };

  beforeEach(() => {
    setAppContext({ log: { save: jest.fn() } });
  });

  it('maps every legacy queue name to a destination', () => {
    expect(DESTINATION_BY_QUEUE_NAME).toEqual({
      writingQueueManager: 'manager',
      writingQueueTask: 'task',
      writingQueueEvent: 'event',
      writingQueueGateway: 'gateway',
    });
  });

  it('publishes to each of the four destinations', async () => {
    const bus = createAdminApiMessageBus(config);
    await bus.init();
    for (const destination of Object.values(DESTINATION_BY_QUEUE_NAME)) {
      await expect(bus.publish(destination, { workflowId: 'w1' })).resolves.toEqual({ messageId: expect.any(String) });
    }
    await bus.close();
  });

  it('rejects publishing to an unknown destination', async () => {
    const bus = createAdminApiMessageBus(config);
    await bus.init();
    await expect(bus.publish('other', {})).rejects.toBeDefined();
    await bus.close();
  });
});
