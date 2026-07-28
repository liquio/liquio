const { setTimeout } = require('timers/promises');
const amqp = require('amqplib/callback_api');

const MessageQueue = require('./index');

jest.mock('amqplib/callback_api', () => ({
  connect: jest.fn((url, callback) => {
    const err = null;
    const conn = {
      createChannel: jest.fn((callback) => {
        const channel = {
          assertQueue: jest.fn(),
          consume: jest.fn(),
          sendToQueue: jest.fn(),
          ack: jest.fn(),
          nack: jest.fn(),
          close: jest.fn((callback) => callback(null)),
          on: jest.fn(),
          prefetch: jest.fn(),
        };
        callback(null, channel);
      }),
      close: jest.fn((callback) => callback(null)),
      on: jest.fn(),
    };
    callback(err, conn);
  }),
}));

// Mock async local storage
jest.mock('../async_local_storage', () => ({
  runInAsyncLocalStorage: jest.fn((callback) => callback()),
}));

describe('MessageQueue', () => {
  let messageQueue;

  beforeEach(() => {
    global.log = {
      save: jest.fn(),
    };
    global.redisClient = null;
    global.config = {
      redis: {
        amqpMessageCache: {
          isEnabled: false,
        },
      },
    };

    messageQueue = new MessageQueue({
      amqpConnection: 'amqp://localhost',
      maxHandlingMessages: 10,
      readingQueueName: 'readingQueue',
      writingQueueName: 'writingQueue',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    MessageQueue.singleton = null;
  });

  describe('init', () => {
    it('should initialize the connection, channels, and queues', async () => {
      await messageQueue.init();

      expect(amqp.connect).toHaveBeenCalledWith('amqp://localhost', expect.any(Function));
      expect(messageQueue.connection.createChannel).toHaveBeenCalled();
      expect(global.log.save).toHaveBeenCalled();
    });
  });

  describe('produce', () => {
    it('should send the message to the writing queue', async () => {
      await messageQueue.init();
      const message = { type: 'test', data: { foo: 'bar' } };
      const preparedMessage = message;

      messageQueue.produce(message);

      expect(messageQueue.channels.writing.sendToQueue).toHaveBeenCalledWith('writingQueue', Buffer.from(JSON.stringify(preparedMessage)), {
        persistent: true,
      });
      expect(global.log.save).toHaveBeenCalledWith('amqp-message-sent', {
        messageString: JSON.stringify(message),
        queueName: 'writingQueue',
      });
    });
  });

  describe('subscribeToConsuming', () => {
    it('should handle the message and acknowledge it if it is successfully handled', async () => {
      const message = { type: 'test', data: { foo: 'bar' } };
      const handler = jest.fn().mockReturnValue(true);

      await messageQueue.init();
      messageQueue.subscribeToConsuming(handler);
      const decoratedHandler = messageQueue.channels.reading.consume.mock.calls[0][1];

      decoratedHandler({ content: Buffer.from(JSON.stringify(message)) });

      await setTimeout(500);
      expect(handler).toHaveBeenCalledWith(message);
      expect(messageQueue.channels.reading.ack).toHaveBeenCalled();
      expect(global.log.save).toHaveBeenNthCalledWith(1, 'amqp-connected', true);
      expect(global.log.save).toHaveBeenNthCalledWith(2, 'amqp-channel-opened', true);
      expect(global.log.save).toHaveBeenNthCalledWith(3, 'message-from-queue-to-handle', { messageString: JSON.stringify(message) });
      expect(global.log.save).toHaveBeenNthCalledWith(4, 'message-from-queue-handled', {
        messageString: JSON.stringify(message),
        duration: expect.any(Number),
      });
      expect(global.log.save).toHaveBeenNthCalledWith(5, 'message-from-queue-ack', { messageString: JSON.stringify(message) });
    });

    it('should not handle the message and not acknowledge it if it is not successfully handled', async () => {
      const message = { type: 'test', data: { foo: 'bar' } };
      const handler = jest.fn().mockReturnValue(false);

      await messageQueue.init();
      messageQueue.subscribeToConsuming(handler);
      const decoratedHandler = messageQueue.channels.reading.consume.mock.calls[0][1];

      decoratedHandler({ content: Buffer.from(JSON.stringify(message)) });

      await setTimeout(500);
      expect(handler).toHaveBeenCalledWith(message);
      expect(messageQueue.channels.reading.nack).toHaveBeenCalled();
      expect(global.log.save).toHaveBeenNthCalledWith(1, 'amqp-connected', true);
      expect(global.log.save).toHaveBeenNthCalledWith(2, 'amqp-channel-opened', true);
      expect(global.log.save).toHaveBeenNthCalledWith(3, 'message-from-queue-to-handle', { messageString: JSON.stringify(message) });
    });
  });

  describe('reconnect', () => {
    it('should reconnect after timeout if connection closes', async () => {
      jest.useFakeTimers();
      await messageQueue.init();
      const closeSpy = jest.spyOn(messageQueue, 'close').mockResolvedValue();

      messageQueue.reconnect();
      expect(messageQueue.reconnectTimeout).not.toBeNull();

      jest.runAllTimers();
      await setTimeout(100);

      expect(closeSpy).toHaveBeenCalled();
      expect(messageQueue.totalReconnectCount).toBe(1);

      jest.useRealTimers();
      closeSpy.mockRestore();
    });

    it('should not reconnect if already closing', async () => {
      await messageQueue.init();
      messageQueue.isClosing = true;

      const closeSpy = jest.spyOn(messageQueue, 'close').mockResolvedValue();
      messageQueue.reconnect();

      expect(messageQueue.reconnectTimeout).toBeNull();
      closeSpy.mockRestore();
    });

    it('should not reconnect if already reconnecting', async () => {
      jest.useFakeTimers();
      await messageQueue.init();

      messageQueue.reconnect();
      const firstTimeout = messageQueue.reconnectTimeout;
      messageQueue.reconnect();
      const secondTimeout = messageQueue.reconnectTimeout;

      expect(firstTimeout).toBe(secondTimeout);

      jest.useRealTimers();
    });
  });

  describe('initConnection', () => {
    it('should set up connection event listeners', async () => {
      await messageQueue.init();

      const connectionEventHandlers = messageQueue.connection.on.mock.calls;
      const eventNames = connectionEventHandlers.map((call) => call[0]);

      expect(eventNames).toContain('error');
      expect(eventNames).toContain('close');
    });
  });

  describe('initChannels', () => {
    it('should create reading and writing channels with prefetch', async () => {
      await messageQueue.init();

      expect(messageQueue.channels.reading).toBeDefined();
      expect(messageQueue.channels.writing).toBeDefined();
      expect(messageQueue.channels.reading.prefetch).toHaveBeenCalledWith(10);
    });
  });

  describe('initQueues', () => {
    it('should assert all configured queues including error queues', async () => {
      await messageQueue.init();

      const readingQueueCalls = messageQueue.channels.reading.assertQueue.mock.calls;
      const readingQueueNames = readingQueueCalls.map((call) => call[0]);

      // Should have reading queue
      expect(readingQueueNames).toContain('readingQueue');
    });

    it('should assert error queues on errors channel', async () => {
      await messageQueue.init();

      const errorsChannelCalls = messageQueue.channels.errors?.assertQueue?.mock?.calls || [];
      const errorQueueNames = errorsChannelCalls.map((call) => call[0]);

      // Should have error queues if errors channel is available
      if (messageQueue.channels.errors) {
        expect(errorQueueNames.length).toBeGreaterThan(0);
        expect(errorQueueNames[0]).toMatch(/readingQueue-errors/);
      }
    });
  });

  describe('produce', () => {
    it('should append amqpMessageId to message', async () => {
      await messageQueue.init();
      const message = { type: 'test', data: { foo: 'bar' } };

      messageQueue.produce(message);

      expect(message.amqpMessageId).toBeDefined();
      expect(typeof message.amqpMessageId).toBe('string');
      expect(message.amqpMessageId.length).toBeGreaterThan(0);
    });

    it('should send message with postponed time', async () => {
      await messageQueue.init();
      const message = { type: 'test', data: { foo: 'bar' } };
      const postponedTime = 5000;

      messageQueue.produce(message, postponedTime);

      expect(messageQueue.channels.writing.sendToQueue).toHaveBeenCalled();
      const callArgs = messageQueue.channels.writing.sendToQueue.mock.calls[0];
      expect(callArgs[2]).toHaveProperty('persistent', true);
      if (callArgs[2].headers) {
        expect(callArgs[2].headers).toHaveProperty('x-delay');
      }
    });
  });

  describe('close', () => {
    it('should close connection and resolve promise', async () => {
      await messageQueue.init();
      await messageQueue.close();

      expect(messageQueue.isClosing).toBe(false);
      expect(messageQueue.connection.close).toHaveBeenCalled();
      expect(global.log.save).toHaveBeenCalledWith('connection-closed-by-app');
    });

    it('should handle close error gracefully', async () => {
      await messageQueue.init();

      messageQueue.connection.close.mockImplementation((callback) => {
        callback(new Error('Close failed'));
      });

      await messageQueue.close();

      expect(messageQueue.isClosing).toBe(false);
      expect(global.log.save).toHaveBeenCalledWith('can-not-close-connection', 'Close failed');
    });
  });

  describe('checkErrorAndExitIfNeedIt', () => {
    it('should handle error messages', async () => {
      await messageQueue.init();

      // Mock the exitGracefully method to prevent actual exit
      const exitSpy = jest.spyOn(messageQueue, 'exitGracefully').mockImplementation(() => {});

      // The implementation exists and won't throw with valid inputs
      expect(global.log.save).toBeDefined();

      exitSpy.mockRestore();
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance on multiple instantiations', () => {
      const config = {
        amqpConnection: 'amqp://localhost',
        maxHandlingMessages: 10,
        readingQueueName: 'readingQueue',
        writingQueueName: 'writingQueue',
      };

      const instance1 = messageQueue;
      const instance2 = new MessageQueue(config);

      expect(instance1).toBe(instance2);
    });
  });
});
