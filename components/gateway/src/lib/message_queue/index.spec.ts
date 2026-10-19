import { setTimeout as delay } from 'node:timers/promises';

import * as amqp from 'amqplib/callback_api';

import { MessageQueue, pickMessageMeta } from './index';

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

describe('MessageQueue', () => {
  let messageQueue;

  beforeEach(() => {
    global.log = {
      save: jest.fn(),
    };

    messageQueue = new MessageQueue({
      amqpConnection: 'amqp://localhost',
      maxHandlingMessages: 10,
      readingQueueName: 'readingQueue',
      writingQueueName: 'writingQueue',
    });
  });

  afterEach(() => {
    jest.useRealTimers(); // Ensure timers are restored
    jest.clearAllMocks();
    MessageQueue.singleton = null; // Reset singleton
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
      const message: any = { type: 'test', data: { foo: 'bar' } };
      const preparedMessage = message;

      messageQueue.produce(message);

      expect(messageQueue.channels.writing.sendToQueue).toHaveBeenCalledWith('writingQueue', Buffer.from(JSON.stringify(preparedMessage)), {
        persistent: true,
      });
      expect(global.log.save).toHaveBeenCalledWith('amqp-message-sent', {
        amqpMessageId: message.amqpMessageId,
        type: 'test',
        length: JSON.stringify(message).length,
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

      await delay(500);
      expect(handler).toHaveBeenCalledWith(message);
      expect(messageQueue.channels.reading.ack).toHaveBeenCalled();
      expect(global.log.save).toHaveBeenCalledWith('message-from-queue-handled', { type: 'test' });
    });

    it('should not handle the message and not acknowledge it if it is not successfully handled', async () => {
      const message = { type: 'test', data: { foo: 'bar' } };
      const handler = jest.fn().mockReturnValue(false);

      await messageQueue.init();
      messageQueue.subscribeToConsuming(handler);
      const decoratedHandler = messageQueue.channels.reading.consume.mock.calls[0][1];

      decoratedHandler({ content: Buffer.from(JSON.stringify(message)) });

      await delay(500);
      expect(handler).toHaveBeenCalledWith(message);
      expect(messageQueue.channels.reading.nack).toHaveBeenCalled();
      expect(global.log.save).toHaveBeenCalledWith('message-from-queue-not-handled', { type: 'test' });
    });
  });

  describe('reconnect', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not reconnect if isClosing is true', () => {
      messageQueue.isClosing = true;
      messageQueue.reconnect();

      expect(messageQueue.reconnectTimeout).toBeNull();
    });

    it('should not reconnect if already reconnecting', () => {
      messageQueue.reconnectTimeout = setTimeout(() => {}, 1000);
      const currentTimeout = messageQueue.reconnectTimeout;

      messageQueue.reconnect();

      expect(messageQueue.reconnectTimeout).toBe(currentTimeout);
    });

    it('should schedule reconnection after delay', () => {
      messageQueue.reconnect();

      expect(messageQueue.reconnectTimeout).not.toBeNull();
    });
  });

  describe('initConnection', () => {
    it('should subscribe to connection error events', async () => {
      await messageQueue.init();

      const onCall = messageQueue.connection.on.mock.calls.find((call) => call[0] === 'error');
      expect(onCall).toBeDefined();
      expect(onCall[1]).toBeInstanceOf(Function);
    });

    it('should subscribe to connection close events', async () => {
      await messageQueue.init();

      const onCall = messageQueue.connection.on.mock.calls.find((call) => call[0] === 'close');
      expect(onCall).toBeDefined();
      expect(onCall[1]).toBeInstanceOf(Function);
    });
  });

  describe('initChannels', () => {
    it('should create two channels', async () => {
      await messageQueue.init();

      expect(messageQueue.channels.reading).toBeDefined();
      expect(messageQueue.channels.writing).toBeDefined();
      expect(messageQueue.connection.createChannel).toHaveBeenCalledTimes(2);
    });

    it('should set prefetch on reading channel', async () => {
      await messageQueue.init();

      expect(messageQueue.channels.reading.prefetch).toHaveBeenCalledWith(10);
    });
  });

  describe('createNewChannel', () => {
    it('should subscribe to channel error events', async () => {
      await messageQueue.init();
      const channel = messageQueue.channels.reading;

      const errorCall = channel.on.mock.calls.find((call) => call[0] === 'error');
      expect(errorCall).toBeDefined();
      expect(errorCall[1]).toBeInstanceOf(Function);
    });

    it('should subscribe to channel close events', async () => {
      await messageQueue.init();
      const channel = messageQueue.channels.reading;

      const closeCall = channel.on.mock.calls.find((call) => call[0] === 'close');
      expect(closeCall).toBeDefined();
      expect(closeCall[1]).toBeInstanceOf(Function);
    });
  });

  describe('close', () => {
    it('should close the connection', async () => {
      await messageQueue.init();
      await messageQueue.close();

      expect(messageQueue.connection.close).toHaveBeenCalled();
      expect(global.log.save).toHaveBeenCalledWith('connection-closed-by-app');
      expect(messageQueue.isClosing).toBe(false);
    });

    it('should handle close errors gracefully', async () => {
      await messageQueue.init();

      messageQueue.connection.close.mockImplementationOnce((callback) => {
        callback(new Error('Close failed'));
      });

      await messageQueue.close();

      expect(global.log.save).toHaveBeenCalledWith('can-not-close-connection', expect.any(String));
      expect(messageQueue.isClosing).toBe(false);
    });
  });

  describe('produce with redis caching', () => {
    it('should add amqpMessageId to message', async () => {
      await messageQueue.init();
      const message: any = { type: 'test', data: { foo: 'bar' } };

      messageQueue.produce(message);

      expect(message.amqpMessageId).toBeDefined();
      expect(typeof message.amqpMessageId).toBe('string');
    });

    it('should handle produce errors', async () => {
      await messageQueue.init();
      const message = { type: 'test', data: { foo: 'bar' } };

      messageQueue.channels.writing.sendToQueue.mockImplementationOnce(() => {
        throw new Error('Send failed');
      });

      expect(() => {
        messageQueue.produce(message);
      }).toThrow();
    });
  });

  describe('subscribeToConsuming with redis caching', () => {
    it('should parse JSON messages correctly', async () => {
      const message = { type: 'test', data: { foo: 'bar' }, amqpMessageId: 'msg-123' };
      const handler = jest.fn().mockReturnValue(true);

      await messageQueue.init();
      messageQueue.subscribeToConsuming(handler);
      const decoratedHandler = messageQueue.channels.reading.consume.mock.calls[0][1];

      decoratedHandler({ content: Buffer.from(JSON.stringify(message)) });

      await delay(500);
      expect(handler).toHaveBeenCalledWith(message);
    });

    it('should handle JSON parse errors gracefully', async () => {
      const handler = jest.fn().mockReturnValue(true);

      await messageQueue.init();
      messageQueue.subscribeToConsuming(handler);
      const decoratedHandler = messageQueue.channels.reading.consume.mock.calls[0][1];

      decoratedHandler({ content: Buffer.from('invalid json') });

      await delay(500);
      expect(global.log.save).toHaveBeenCalledWith(
        'message-parse-error',
        expect.objectContaining({
          error: expect.any(String),
          length: 'invalid json'.length,
        }),
        'error',
      );
      expect(JSON.stringify((global.log.save as jest.Mock).mock.calls)).not.toContain('invalid json"');
      expect(messageQueue.channels.reading.ack).toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('poison messages', () => {
    const consume = async (handler, content, redisClient?) => {
      if (redisClient) {
        (global as any).redisClient = redisClient;
        (global as any).config = { redis: { amqpMessageCache: { isEnabled: true } } };
      }
      await messageQueue.init();
      messageQueue.subscribeToConsuming(handler);
      const decoratedHandler = messageQueue.channels.reading.consume.mock.calls[0][1];
      const message = { content: Buffer.from(content) };
      decoratedHandler(message);
      await delay(100);
      return message;
    };

    afterEach(() => {
      delete (global as any).redisClient;
      delete (global as any).config;
    });

    it.each([['not json'], ['null'], ['"str"'], ['42'], ['[]']])('should ack %s without calling the handler or requeueing', async (payload) => {
      const handler = jest.fn().mockReturnValue(true);
      const message = await consume(handler, payload);

      expect(handler).not.toHaveBeenCalled();
      expect(messageQueue.channels.reading.ack).toHaveBeenCalledWith(message);
      expect(messageQueue.channels.reading.nack).not.toHaveBeenCalled();
      expect(JSON.stringify((global.log.save as jest.Mock).mock.calls)).not.toContain(`"${payload}"`);
    });

    it('should nack without requeue and not reject when the handler throws', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('boom'));
      const message = await consume(handler, JSON.stringify({ workflowId: 'wf-1', secret: 'top-secret' }));

      expect(messageQueue.channels.reading.nack).toHaveBeenCalledWith(message, false, false);
      expect(messageQueue.channels.reading.ack).not.toHaveBeenCalled();
      expect(global.log.save).toHaveBeenCalledWith('message-from-queue-handler-error', { workflowId: 'wf-1', error: 'boom' }, 'error');
    });

    it('should keep nack with requeue default when the handler returns false', async () => {
      const handler = jest.fn().mockReturnValue(false);
      const message = await consume(handler, JSON.stringify({ type: 'test' }));

      expect(messageQueue.channels.reading.nack).toHaveBeenCalledWith(message);
    });
  });

  describe('redis dedupe', () => {
    it('should ack every repeat without calling the handler and never delete the key', async () => {
      const redisClient = { get: jest.fn().mockResolvedValue('msg-1'), set: jest.fn(), delete: jest.fn() };
      (global as any).redisClient = redisClient;
      (global as any).config = { redis: { amqpMessageCache: { isEnabled: true } } };
      const handler = jest.fn().mockReturnValue(true);

      await messageQueue.init();
      messageQueue.subscribeToConsuming(handler);
      const decoratedHandler = messageQueue.channels.reading.consume.mock.calls[0][1];
      const content = Buffer.from(JSON.stringify({ type: 'test', amqpMessageId: 'msg-1' }));
      decoratedHandler({ content });
      decoratedHandler({ content });
      decoratedHandler({ content });
      await delay(200);

      expect(handler).not.toHaveBeenCalled();
      expect(messageQueue.channels.reading.ack).toHaveBeenCalledTimes(3);
      expect(redisClient.delete).not.toHaveBeenCalled();

      delete (global as any).redisClient;
      delete (global as any).config;
    });

    it('should set the key with ttl after successful handling', async () => {
      const redisClient = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), delete: jest.fn() };
      (global as any).redisClient = redisClient;
      (global as any).config = { redis: { amqpMessageCache: { isEnabled: true } } };

      await messageQueue.init();
      messageQueue.subscribeToConsuming(jest.fn().mockReturnValue(true));
      messageQueue.channels.reading.consume.mock.calls[0][1]({ content: Buffer.from(JSON.stringify({ amqpMessageId: 'msg-2' })) });
      await delay(200);

      expect(redisClient.set).toHaveBeenCalledWith('amqp-message-id.msg-2', 'msg-2', 7200);

      delete (global as any).redisClient;
      delete (global as any).config;
    });
  });

  describe('pickMessageMeta', () => {
    it('should keep only id fields', () => {
      expect(pickMessageMeta({ workflowId: 'w', gatewayTemplateId: 3, type: 't', documents: [1], secret: 's', amqpMessageId: { a: 1 } })).toEqual({
        workflowId: 'w',
        gatewayTemplateId: 3,
        type: 't',
      });
    });

    it('should return empty meta for non-objects', () => {
      expect(pickMessageMeta(null)).toEqual({});
      expect(pickMessageMeta('str')).toEqual({});
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance when constructor is called multiple times', () => {
      const mq1 = new MessageQueue({
        amqpConnection: 'amqp://localhost',
        maxHandlingMessages: 10,
        readingQueueName: 'readingQueue',
        writingQueueName: 'writingQueue',
      });

      const mq2 = new MessageQueue({
        amqpConnection: 'amqp://different',
        maxHandlingMessages: 20,
        readingQueueName: 'otherQueue',
        writingQueueName: 'otherQueue',
      });

      expect(mq1).toBe(mq2);
      expect(mq1.config.amqpConnection).toBe('amqp://localhost');
    });
  });

  describe('getQueueParams', () => {
    it('should return default params if no custom params are provided', () => {
      const params = messageQueue.getQueueParams('testQueue');
      expect(params).toEqual({ durable: true });
    });

    it('should merge custom params with defaults', () => {
      messageQueue.config.queueParams = [
        {
          queueName: 'readingQueue',
          params: { maxLength: 1000 },
        },
      ];

      const params = messageQueue.getQueueParams('readingQueue');
      expect(params).toEqual({ durable: true, maxLength: 1000 });
    });
  });
});
