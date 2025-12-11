const _ = require('lodash');
const amqp = require('amqplib/callback_api');
const uuid = require('uuid-random');

const { runInAsyncLocalStorage } = require('../async_local_storage');

// Constants.
const RETRY_CONNECTION_TIME = 10 * 1000;
const ERRORS_TO_RESTART = ['Error: socket hang up'];
const REDIS_AMQP_KEY_PREFIX = 'amqp-message-id';
const DEFAULT_REDIS_TTL = 60 * 60 * 2;

/**
 * Message queue.
 */
class MessageQueue {
  /**
   * Message queue constructor.
   * @param {object} config Config.
   * @param {string} config.amqpConnection AMQP connection string.
   * @param {number} config.maxHandlingMessages Max handling messages count.
   * @param {string} config.readingQueueName Reading queue name.
   * @param {string} config.writingQueueName Writing queue name.
   */
  constructor(config, props = {}) {
    // Define singleton.
    if (!MessageQueue.singleton) {
      this.config = config;
      this.props = props;
      this.connection = null;
      this.channels = null;
      this.isClosing = false;
      this.reconnectTimeout = null;
      this.totalReconnectCount = 0;
      MessageQueue.singleton = this;
    }
    return MessageQueue.singleton;
  }

  /**
   * Init.
   */
  async init() {
    const { onInit } = this.props;

    await this.initConnection();
    await this.initChannels();
    this.initQueues();

    onInit && onInit();
  }

  /**
   * Reconnect
   */
  reconnect() {
    // Check if no need to reconnect.
    if (this.isClosing) return;

    // Check if already reconnecting.
    if (this.reconnectTimeout) return;

    // Try to reconnect.
    this.reconnectTimeout = setTimeout(async () => {
      log.save('amqp-starting-reconnect', { totalReconnectCount: this.totalReconnectCount });
      await this.close();
      this.reconnectTimeout = null;
      await this.init();
      this.totalReconnectCount += 1;
      log.save('amqp-successfully-reconnected', { totalReconnectCount: this.totalReconnectCount });
    }, this.config.retryConnectionTime || RETRY_CONNECTION_TIME);
  }

  /**
   * Init connection.
   * @private
   */
  async initConnection() {
    // Reconnect on close.
    this.isClosing = false;

    return new Promise((resolve) => {
      amqp.connect(this.config.amqpConnection, (error, connection) => {
        // Check error.
        if (error) {
          log.save('amqp-connection-error|cannot-create-connection', error);
          return this.reconnect();
        }

        // Subscribe on error events.
        connection.on('error', async (error) => {
          log.save('amqp-connection-error', error && error.message);
        });

        // Subscribe on connection close events.
        connection.on('close', async () => {
          log.save('amqp-connection-closed');
          return this.reconnect();
        });

        // Save connection.
        this.connection = connection;
        log.save('amqp-connected', true);
        resolve();
      });
    });
  }

  /**
   * Init channels.
   * @private
   */
  async initChannels() {
    // Create channels.
    const [reading, writing] = await Promise.all([this.createNewChannel(), this.createNewChannel()]);
    log.save('amqp-channel-opened', true);

    // Save channels.
    this.channels = { reading, writing };

    // Set channels options.
    this.channels.reading.prefetch(this.config.maxHandlingMessages);
  }

  /**
   * Init queues.
   * @private
   */
  initQueues() {
    // Assert queues.
    this.channels.reading.assertQueue(this.config.readingQueueName, this.getQueueParams(this.config.readingQueueName));
    this.channels.writing.assertQueue(this.config.writingQueueName, this.getQueueParams(this.config.writingQueueName));
  }

  /**
   * Get queue params
   * @private
   */
  getQueueParams(queueName, defaults = { durable: true }) {
    const { queueParams = [] } = this.config;

    return queueParams.filter((param) => queueName === param.queueName).reduce((acc, { params = {} }) => _.merge(acc, params), defaults);
  }

  /**
   * Create new channel.
   * @private
   * @returns {Promise<object>}
   */
  async createNewChannel() {
    return new Promise((resolve) => {
      // Create channel.
      this.connection.createChannel((error, ch) => {
        // Check error.
        if (error) {
          log.save('amqp-channel-error|cannot-create-channel', error);
          return this.reconnect();
        }

        // Subscribe on error events.
        ch.on('error', async (error) => {
          log.save('amqp-channel-error', error && error.message);
        });

        // Subscribe on channel close events.
        ch.on('close', async (data) => {
          log.save('amqp-channel-closed', data);
          return this.reconnect();
        });

        // Return created channel.
        resolve(ch);
      });
    });
  }

  /**
   * Produce.
   * @param {{type: string, data: object}} message Message object.
   * @returns {boolean}
   */
  produce(message) {
    try {
      // Append message.
      message.amqpMessageId = uuid();

      // Prepare message.
      const messageString = JSON.stringify(message);
      const preparedMessage = Buffer.from(messageString);

      // Send mesage to queue.
      this.channels.writing.sendToQueue(this.config.writingQueueName, preparedMessage, {
        persistent: true,
      });
      log.save('amqp-message-sent', { messageString });
      return true;
    } catch (error) {
      this.checkErrorAndExitIfNeedIt(error);
      throw error;
    }
  }

  /**
   * Subscribe to consuming.
   * @param {function(object)} handler Handler to work with message object.
   */
  subscribeToConsuming(handler) {
    // Decorate handler.
    const decoratedHandler = async (message) => {
      runInAsyncLocalStorage(async () => {
        // Convert message.
        const messageString = message.content.toString();
        log.save('message-from-queue-to-handle', { messageString });
        let messageObject;
        try {
          messageObject = JSON.parse(messageString);
        } catch (error) {
          // Log parse error.
          log.save('message-parse-error', { error: error && error.message, messageString });

          // Inform message handled and return.
          this.channels.reading.ack(message);
          return;
        }

        const { amqpMessageId } = messageObject;

        // Try to get amqp message id.
        if (global.redisClient && global.config?.redis?.amqpMessageCache?.isEnabled && amqpMessageId) {
          try {
            const amqpMessageIdFromRedis = await global.redisClient.get(`${REDIS_AMQP_KEY_PREFIX}.${amqpMessageId}`);
            if (amqpMessageIdFromRedis) {
              try {
                // Inform that handled.
                log.save('message-from-queue-handled-from-redis', { messageString });
                this.channels.reading.ack(message);
                log.save('message-from-queue-ack-from-redis', { messageString });
              } catch (error) {
                log.save('message-from-queue-ack-error-from-redis', error.message, 'error');
                return;
              }
              await global.redisClient.delete(`${REDIS_AMQP_KEY_PREFIX}.${amqpMessageId}`);
              return;
            }
          } catch (error) {
            log.save('message-from-queue-id-get-redis-error', error.message, 'error');
          }
        }

        // Handle.
        const isHandled = await handler(messageObject);

        // Check handling status.
        if (!isHandled) {
          // Inform that not handled and exit.
          log.save('message-from-queue-not-handled', { messageString });
          this.channels.reading.nack(message);
          return;
        }

        // Inform that handled.
        log.save('message-from-queue-handled', { messageString });
        this.channels.reading.ack(message);
        log.save('message-from-queue-ack', { messageString });

        // Try to set amqp message id.
        if (global.redisClient && global.config?.redis?.amqpMessageCache?.isEnabled && amqpMessageId) {
          try {
            const ttl = global.config?.redis?.amqpMessageCache?.ttl || DEFAULT_REDIS_TTL;
            await global.redisClient.set(`${REDIS_AMQP_KEY_PREFIX}.${amqpMessageId}`, amqpMessageId, ttl);
          } catch (error) {
            log.save('message-from-queue-id-set-redis-error', error.message, 'error');
          }
        }
      });
    };

    // Get message from queue.
    this.channels.reading.consume(this.config.readingQueueName, decoratedHandler, { noAck: false });
  }

  /**
   * Close connection.
   */
  async close() {
    // Set status.
    this.isClosing = true;

    // Close connection.
    return new Promise((resolve) => {
      this.connection.close((error) => {
        if (error) {
          log.save('can-not-close-connection', error && error.message);
          this.isClosing = false;
          return resolve();
        }

        log.save('connection-closed-by-app');
        this.isClosing = false;
        return resolve();
      });
    });
  }

  /**
   * Check error and exit if need it.
   * @private
   * @param {Error} error Error to check.
   */
  checkErrorAndExitIfNeedIt(error) {
    // Define error message.
    const errorMessage = error && error.message;

    // Exit if need it.
    if (ERRORS_TO_RESTART.some(errorMessage)) {
      this.exitApp();
    }
  }

  /**
   * Exit app.
   */
  async exitApp() {
    // Try to exit safety.
    (async () => process.exit(1))();

    // Wait after 5 seconds.
    setTimeout(() => process.kill(process.pid, 'SIGTERM'), 5000);
  }
}

module.exports = MessageQueue;
