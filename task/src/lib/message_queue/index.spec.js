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
    jest.clearAllMocks();
  });

  describe('init', () => {
    it('should initialize the connection, channels, and queues', async () => {
      await messageQueue.init();

      expect(amqp.connect).toHaveBeenCalledWith(
        'amqp://localhost',
        expect.any(Function),
      );
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

      expect(messageQueue.channels.writing.sendToQueue).toHaveBeenCalledWith(
        'writingQueue',
        Buffer.from(JSON.stringify(preparedMessage)),
        { persistent: true },
      );
      expect(global.log.save).toHaveBeenCalledWith('amqp-message-sent', {
        messageString: JSON.stringify(message),
      });
    });
  });

  describe('subscribeToConsuming', () => {
    it('should handle the message and acknowledge it if it is successfully handled', async () => {
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

    it('should not handle the message and not acknowledge it if it is not successfully handled', async () => {
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
  });
});
