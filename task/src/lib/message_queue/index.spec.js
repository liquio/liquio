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

jest.mock('../async_local_storage', () => ({
  runInAsyncLocalStorage: jest.fn((handler) => {
    if (typeof handler === 'function') {
      return handler();
    }
  }),
}));

describe('MessageQueue', () => {
  let messageQueue;

  beforeEach(() => {
    global.log = {
      save: jest.fn(),
    };

    messageQueue = new MessageQueue({
      amqpConnection: 'amqp://localhost',
      maxHandlingMessages: 10,
      maxHandlingGeneratingPdfMessages: 5,
      readingQueueName: 'readingQueue',
      writingQueueName: 'writingQueue',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    MessageQueue.singleton = null;
  });

  describe('constructor', () => {
    it('should create a singleton instance', () => {
      const instance1 = new MessageQueue({
        amqpConnection: 'amqp://localhost',
        readingQueueName: 'queue1',
        writingQueueName: 'queue2',
      });

      const instance2 = new MessageQueue({
        amqpConnection: 'amqp://different',
        readingQueueName: 'queue3',
        writingQueueName: 'queue4',
      });

      expect(instance1).toBe(instance2);
      expect(instance1.config.amqpConnection).toBe('amqp://localhost');
    });

    it('should set error queue names based on reading queue name', () => {
      expect(messageQueue.config.errorQueueName10M).toBe('readingQueue-errors-10m');
      expect(messageQueue.config.errorQueueName1H).toBe('readingQueue-errors-1h');
      expect(messageQueue.config.errorQueueName2H).toBe('readingQueue-errors-2h');
      expect(messageQueue.config.errorQueueName8H).toBe('readingQueue-errors-8h');
      expect(messageQueue.config.errorQueueName1D).toBe('readingQueue-errors-1d');
    });
  });

  describe('initConnection', () => {
    it('should establish amqp connection and subscribe to events', async () => {
      await messageQueue.initConnection();

      expect(amqp.connect).toHaveBeenCalledWith(
        'amqp://localhost',
        expect.any(Function),
      );
      expect(messageQueue.connection).toBeDefined();
      expect(messageQueue.connection.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(messageQueue.connection.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should call reconnect on connection error', async () => {
      const reconnectSpy = jest.spyOn(messageQueue, 'reconnect');
      
      amqp.connect.mockImplementationOnce((url, callback) => {
        const err = new Error('Connection failed');
        callback(err);
      });

      await messageQueue.initConnection();

      expect(reconnectSpy).toHaveBeenCalled();
      reconnectSpy.mockRestore();
    });
  });

  describe('initChannels', () => {
    it('should create 6 channels and set prefetch options', async () => {
      await messageQueue.initConnection();
      await messageQueue.initChannels();

      expect(messageQueue.channels).toBeDefined();
      expect(messageQueue.channels.reading).toBeDefined();
      expect(messageQueue.channels.writing).toBeDefined();
      expect(messageQueue.channels.readingPdf).toBeDefined();
      expect(messageQueue.channels.writingPdf).toBeDefined();
      expect(messageQueue.channels.errors).toBeDefined();
      expect(messageQueue.channels.delayedAutoCommit).toBeDefined();

      expect(messageQueue.channels.reading.prefetch).toHaveBeenCalledWith(10);
      expect(messageQueue.channels.readingPdf.prefetch).toHaveBeenCalledWith(5);
    });
  });

  describe('initQueues', () => {
    it('should assert main queues', async () => {
      await messageQueue.initConnection();
      await messageQueue.initChannels();
      messageQueue.initQueues();

      expect(messageQueue.channels.reading.assertQueue).toHaveBeenCalledWith(
        'readingQueue',
        { durable: true },
      );
      expect(messageQueue.channels.writing.assertQueue).toHaveBeenCalledWith(
        'writingQueue',
        { durable: true },
      );
    });

    it('should assert error queues with ttl and dead letter routing', async () => {
      await messageQueue.initConnection();
      await messageQueue.initChannels();
      messageQueue.initQueues();

      const errorQueueCalls = messageQueue.channels.errors.assertQueue.mock.calls;

      // Check that error queues are created
      expect(errorQueueCalls.length).toBeGreaterThan(0);

      // Verify at least one error queue has proper configuration
      const errorQueueCall = errorQueueCalls.find(
        call => call[0] === 'readingQueue-errors-10m'
      );
      expect(errorQueueCall).toBeDefined();
      expect(errorQueueCall[1].arguments['x-message-ttl']).toBe(10 * 60 * 1000);
      expect(errorQueueCall[1].arguments['x-dead-letter-routing-key']).toBe('readingQueue');
    });
  });

  describe('init', () => {
    it('should initialize the connection, channels, and queues', async () => {
      await messageQueue.init();

      expect(amqp.connect).toHaveBeenCalledWith(
        'amqp://localhost',
        expect.any(Function),
      );
      expect(messageQueue.connection.createChannel).toHaveBeenCalled();
      expect(messageQueue.channels).toBeDefined();
      expect(global.log.save).toHaveBeenCalled();
    });

    it('should call onInit callback if provided', async () => {
      const onInitCallback = jest.fn();
      const mqWithCallback = new MessageQueue(
        {
          amqpConnection: 'amqp://localhost',
          maxHandlingMessages: 10,
          readingQueueName: 'readingQueue',
          writingQueueName: 'writingQueue',
        },
        { onInit: onInitCallback }
      );
      MessageQueue.singleton = null;

      await mqWithCallback.init();

      expect(onInitCallback).toHaveBeenCalled();
    });
  });

  describe('produce', () => {
    it('should send the message to the writing queue with amqpMessageId', async () => {
      await messageQueue.init();
      const message = { type: 'test', data: { foo: 'bar' } };

      await messageQueue.produce(message);

      const sendCall = messageQueue.channels.writing.sendToQueue.mock.calls[0];
      expect(sendCall[0]).toBe('writingQueue');
      expect(sendCall[2]).toEqual({ persistent: true });

      const sentMessage = JSON.parse(sendCall[1].toString());
      expect(sentMessage.type).toBe('test');
      expect(sentMessage.amqpMessageId).toBeDefined();

      expect(global.log.save).toHaveBeenCalledWith('amqp-message-sent', expect.any(Object));
    });

    it('should support producing to custom channel and queue', async () => {
      await messageQueue.init();
      const message = { type: 'pdf', data: { id: 123 } };

      await messageQueue.produce(message, 'writingPdf', 'custom-pdf-queue');

      const sendCall = messageQueue.channels.writingPdf.sendToQueue.mock.calls[0];
      expect(sendCall[0]).toBe('custom-pdf-queue');
    });

    it('should retry sending message on transient error', async () => {
      jest.useFakeTimers();
      await messageQueue.init();

      messageQueue.channels.writing.sendToQueue
        .mockImplementationOnce(() => {
          throw new Error('Transient error');
        })
        .mockImplementationOnce(() => undefined);

      const message = { type: 'test', data: { foo: 'bar' } };
      const producePromise = messageQueue.produce(message);

      jest.advanceTimersByTime(60 * 1000 + 100);
      await producePromise;

      expect(messageQueue.channels.writing.sendToQueue).toHaveBeenCalledTimes(2);
      expect(global.log.save).toHaveBeenCalledWith('amqp-message-try-to-send-again', expect.any(Object));

      jest.useRealTimers();
    });
  });

  describe('subscribeToConsuming', () => {
    it('should handle the message and acknowledge it if successfully handled', async () => {
      const message = { type: 'test', data: { foo: 'bar' } };
      const handler = jest.fn().mockReturnValue(true);

      await messageQueue.init();
      messageQueue.subscribeToConsuming(handler);
      const decoratedHandler =
        messageQueue.channels.reading.consume.mock.calls[0][1];

      decoratedHandler({ content: Buffer.from(JSON.stringify(message)) });

      await setTimeout(500);
      expect(handler).toHaveBeenCalledWith(message);
      expect(messageQueue.channels.reading.ack).toHaveBeenCalled();
      expect(global.log.save).toHaveBeenCalledWith(
        'message-from-queue-handled',
        {
          messageString: JSON.stringify(message),
        },
      );
    });

    it('should not acknowledge message if handler returns false', async () => {
      const message = { type: 'test', data: { foo: 'bar' } };
      const handler = jest.fn().mockReturnValue(false);

      await messageQueue.init();
      messageQueue.subscribeToConsuming(handler);
      const decoratedHandler =
        messageQueue.channels.reading.consume.mock.calls[0][1];

      decoratedHandler({ content: Buffer.from(JSON.stringify(message)) });

      await setTimeout(500);
      expect(handler).toHaveBeenCalledWith(message);
      expect(messageQueue.channels.reading.nack).toHaveBeenCalled();
      expect(global.log.save).toHaveBeenCalledWith(
        'message-from-queue-not-handled',
        {
          messageString: JSON.stringify(message),
        },
      );
    });

    it('should support subscribing to custom channel and queue', async () => {
      const handler = jest.fn();
      await messageQueue.init();

      messageQueue.subscribeToConsuming(handler, 'readingPdf', 'custom-pdf-queue');

      const consumeCall = messageQueue.channels.readingPdf.consume.mock.calls[0];
      expect(consumeCall[0]).toBe('custom-pdf-queue');
    });
  });

  describe('close', () => {
    it('should close the connection', async () => {
      await messageQueue.init();
      await messageQueue.close();

      expect(messageQueue.connection.close).toHaveBeenCalled();
      expect(messageQueue.isClosing).toBe(false);
      expect(global.log.save).toHaveBeenCalledWith('connection-closed-by-app');
    });

    it('should handle error when closing connection', async () => {
      await messageQueue.init();

      messageQueue.connection.close.mockImplementationOnce((callback) => {
        callback(new Error('Close failed'));
      });

      await messageQueue.close();

      expect(global.log.save).toHaveBeenCalledWith(
        'can-not-close-connection',
        'Close failed',
      );
    });

    it('should handle closing when no connection exists', async () => {
      messageQueue.connection = null;
      await messageQueue.close();

      expect(global.log.save).toHaveBeenCalledWith('connection-has-already-been-closed');
      expect(messageQueue.isClosing).toBe(false);
    });
  });

  describe('reconnect', () => {
    it('should reconnect after timeout', async () => {
      jest.useFakeTimers();
      const closeSpy = jest.spyOn(messageQueue, 'close');
      const initSpy = jest.spyOn(messageQueue, 'init');

      await messageQueue.init();
      messageQueue.reconnect();

      expect(messageQueue.reconnectTimeout).toBeDefined();

      jest.advanceTimersByTime(10 * 1000 + 100);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(closeSpy).toHaveBeenCalled();
      expect(initSpy).toHaveBeenCalledTimes(2); // Initial init + reconnect
      expect(messageQueue.totalReconnectCount).toBe(1);
      expect(global.log.save).toHaveBeenCalledWith('amqp-starting-reconnect', expect.any(Object));
      expect(global.log.save).toHaveBeenCalledWith('amqp-successfully-reconnected', { totalReconnectCount: 1 });

      jest.useRealTimers();
      closeSpy.mockRestore();
      initSpy.mockRestore();
    });

    it('should not reconnect if already closing', async () => {
      messageQueue.isClosing = true;
      const closeSpy = jest.spyOn(messageQueue, 'close');

      messageQueue.reconnect();

      expect(closeSpy).not.toHaveBeenCalled();
      expect(messageQueue.reconnectTimeout).toBeNull();
      closeSpy.mockRestore();
    });

    it('should not reconnect if already reconnecting', async () => {
      messageQueue.reconnectTimeout = setTimeout(() => {}, 10000);

      const closeSpy = jest.spyOn(messageQueue, 'close');
      messageQueue.reconnect();

      expect(closeSpy).not.toHaveBeenCalled();
      closeSpy.mockRestore();
    });
  });

  describe('checkErrorAndExitIfNeedIt', () => {
    it('should exit app if error message matches restart errors', () => {
      const exitSpy = jest.spyOn(messageQueue, 'exitApp').mockImplementation(() => {});

      const error = new Error('Error: socket hang up');
      messageQueue.checkErrorAndExitIfNeedIt(error);

      expect(exitSpy).toHaveBeenCalled();
      exitSpy.mockRestore();
    });

    it('should not exit app if error message does not match restart errors', () => {
      const exitSpy = jest.spyOn(messageQueue, 'exitApp').mockImplementation(() => {});

      const error = new Error('Some other error');
      messageQueue.checkErrorAndExitIfNeedIt(error);

      expect(exitSpy).not.toHaveBeenCalled();
      exitSpy.mockRestore();
    });
  });
