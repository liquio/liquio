const _ = require('lodash');
const amqp = require('amqplib/callback_api');
const uuid = require('uuid-random');

const { runInAsyncLocalStorage } = require('../async_local_storage');

// Constants.
const RETRY_CONNECTION_TIME = 10000;
const ERRORS_TO_RESTART = ['Error: socket hang up'];
const REDIS_AMQP_KEY_PREFIX = 'amqp-message-id';
const DEFAULT_REDIS_TTL = 2 * 60 * 60;
const DEFAULT_REDIS_WIP_TTL = 10 * 60;
const DEFAULT_WIP_WAIT_TIME = 5 * 60 * 1000;

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
      this.config = {
        ...config,
        errorQueueName10M: `${config.readingQueueName}-errors-10m`,
        errorQueueName1H: `${config.readingQueueName}-errors-1h`,
        errorQueueName2H: `${config.readingQueueName}-errors-2h`,
        errorQueueName8H: `${config.readingQueueName}-errors-8h`,
        errorQueueName1D: `${config.readingQueueName}-errors-1d`,
      };
      this.connection = null;
      this.channels = null;
      this.props = props;
      this.isClosing = false;
      this.reconnectTimeout = null;
      this.totalReconnectCount = 0;
      this.consumingCount = 0;
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

    onInit?.();

    this.consumingCount = 0;

    process.on('SIGINT', () => {
      this.exitGracefully();
    });

    process.on('SIGTERM', () => {
      this.exitGracefully();
    });
  }

  /**
   * Reconnect.
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
          log.save('amqp-connection-error|cannot-create-connection', error, 'error');
          return this.reconnect();
        }

        // Subscribe on error events.
        connection.on('error', async (error) => {
          log.save('amqp-connection-error', error?.message);
        });
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
    const [reading, writing, errors] = await Promise.all([this.createNewChannel(), this.createNewChannel(), this.createNewChannel()]);
    log.save('amqp-channel-opened', true);

    // Save channels.
    this.channels = { reading, writing, errors };

    // Set channels options.
    this.channels.reading.prefetch(this.config.maxHandlingMessages);
  }

  /**
   * Init queues.
   * @private
   */
  initQueues() {
    // Assert main queues.
    this.channels.reading.assertQueue(this.config.readingQueueName, { durable: true });
    this.channels.writing.assertQueue(this.config.writingQueueName, { durable: true });

    // Assert errors queues.
    const ttl10M = 10 * 60 * 1000;
    const ttl1H = 1 * 60 * 60 * 1000;
    const ttl2H = 2 * 60 * 60 * 1000;
    const ttl8H = 8 * 60 * 60 * 1000;
    const ttl1D = 1 * 24 * 60 * 60 * 1000;
    this.channels.errors.assertQueue(
      this.config.errorQueueName10M,
      this.getQueueParams(this.config.errorQueueName10M, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-message-ttl': ttl10M,
          'x-dead-letter-routing-key': this.config.readingQueueName,
        },
      }),
    );
    this.channels.errors.assertQueue(
      this.config.errorQueueName1H,
      this.getQueueParams(this.config.errorQueueName1H, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-message-ttl': ttl1H,
          'x-dead-letter-routing-key': this.config.readingQueueName,
        },
      }),
    );
    this.channels.errors.assertQueue(
      this.config.errorQueueName2H,
      this.getQueueParams(this.config.errorQueueName2H, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-message-ttl': ttl2H,
          'x-dead-letter-routing-key': this.config.readingQueueName,
        },
      }),
    );
    this.channels.errors.assertQueue(
      this.config.errorQueueName8H,
      this.getQueueParams(this.config.errorQueueName8H, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-message-ttl': ttl8H,
          'x-dead-letter-routing-key': this.config.readingQueueName,
        },
      }),
    );
    this.channels.errors.assertQueue(
      this.config.errorQueueName1D,
      this.getQueueParams(this.config.errorQueueName8H, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-message-ttl': ttl1D,
          'x-dead-letter-routing-key': this.config.readingQueueName,
        },
      }),
    );
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
    return new Promise((resolve, reject) => {
      // Create channel.
      this.connection.createChannel((error, ch) => {
        // Check error.
        if (error) {
          log.save('amqp-channel-error|cannot-create-channel', error);
          return reject(error);
        }

        // Subscribe on error events.
        ch.on('error', async (error) => {
          log.save('amqp-channel-error', error?.message);
        });
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
   * @param {'10m'|'1h'|'2h'|'8h'|'1d'} [postponedTime] Postponed time.
   * @returns {true} Is handled indicator.
   */
  produce(message, postponedTime) {
    try {
      // Append message.
      message.amqpMessageId = uuid();

      // Prepare message.
      const messageString = JSON.stringify(message);
      const preparedMessage = Buffer.from(messageString);

      // Define queue name.
      const queueNames = {
        '10m': this.config.errorQueueName10M,
        '1h': this.config.errorQueueName1H,
        '2h': this.config.errorQueueName2H,
        '8h': this.config.errorQueueName8H,
        '1d': this.config.errorQueueName1D,
      };
      const queueName = (postponedTime && (queueNames[postponedTime] || queueNames['1d'])) || this.config.writingQueueName;

      // Send message to queue.
      log.save('amqp-message-send', { messageString, queueName });
      this.channels.writing.sendToQueue(queueName, preparedMessage, {
        persistent: true,
      });
      log.save('amqp-message-sent', { messageString, queueName });
      return true;
    } catch (error) {
      log.save('amqp-produce-error', { error: error?.message, message, postponedTime });
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
        this.consumingCount++;

        const time = Date.now();

        // Convert message.
        const messageString = message.content.toString();

        log.save('message-from-queue-to-handle', { messageString });

        let messageObject;
        try {
          messageObject = JSON.parse(messageString);
        } catch (error) {
          // Log parse error.
          log.save('message-parse-error', { error: error?.message, messageString });

          // Inform message handled and return.
          this.channels.reading.ack(message);

          // Decrement consuming count.
          this.consumingCount = Math.max(0, this.consumingCount - 1);
          return;
        }

        // Get amqp message id.
        const { amqpMessageId } = messageObject;

        // INFO: Added to prevent double handling.
        // Try to get amqp message id as WIP.
        if (global.redisClient && global.config?.redis?.amqpMessageCache?.isEnabled && amqpMessageId) {
          try {
            const amqpMessageIdWipFromRedis = await global.redisClient.get(`${REDIS_AMQP_KEY_PREFIX}.${amqpMessageId}.wip`);
            if (amqpMessageIdWipFromRedis) {
              await new Promise((resolve) => {
                setTimeout(resolve, DEFAULT_WIP_WAIT_TIME);
              });
              this.channels.reading.nack(message);
              log.save('message-from-queue-not-handled-waited-wip', { amqpMessageId });
              // Decrement consuming count.
              this.consumingCount = Math.max(0, this.consumingCount - 1);
              return;
            }
          } catch (error) {
            log.save('message-from-queue-id-get-wip-redis-error', error.message, 'error');
          }
        }

        // INFO: Added to prevent double handling.
        // Try to set amqp message id as WIP.
        if (global.redisClient && global.config?.redis?.amqpMessageCache?.isEnabled && amqpMessageId) {
          try {
            const ttl = global.config?.redis?.amqpMessageCache?.wipTtl || DEFAULT_REDIS_WIP_TTL;
            await global.redisClient.set(`${REDIS_AMQP_KEY_PREFIX}.${amqpMessageId}.wip`, amqpMessageId, ttl);
          } catch (error) {
            log.save('message-from-queue-id-set-wip-redis-error', { error: error.message, amqpMessageId });
          }
        }

        // Try to get amqp message id.
        if (global.redisClient && global.config?.redis?.amqpMessageCache?.isEnabled && amqpMessageId) {
          try {
            const amqpMessageIdFromRedis = await global.redisClient.get(`${REDIS_AMQP_KEY_PREFIX}.${amqpMessageId}`);
            if (amqpMessageIdFromRedis) {
              try {
                // Inform that handled.
                log.save('message-from-queue-handled-from-redis', { messageString, amqpMessageId });
                this.channels.reading.ack(message);
                log.save('message-from-queue-ack-from-redis', { messageString, amqpMessageId });
              } catch (error) {
                log.save('message-from-queue-ack-error-from-redis', error.message, 'error');

                // Decrement consuming count.
                this.consumingCount = Math.max(0, this.consumingCount - 1);
                return;
              }

              // Decrement consuming count.
              this.consumingCount = Math.max(0, this.consumingCount - 1);
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
          log.save('message-from-queue-not-handled', { messageString, duration: Date.now() - time });
          this.channels.reading.nack(message);

          // Decrement consuming count.
          this.consumingCount = Math.max(0, this.consumingCount - 1);
          return;
        }

        // Try to set amqp message id.
        if (global.redisClient && global.config?.redis?.amqpMessageCache?.isEnabled && amqpMessageId) {
          try {
            const ttl = global.config?.redis?.amqpMessageCache?.ttl || DEFAULT_REDIS_TTL;
            await global.redisClient.set(`${REDIS_AMQP_KEY_PREFIX}.${amqpMessageId}`, amqpMessageId, ttl);
          } catch (error) {
            log.save('message-from-queue-id-set-redis-error', {
              error: error.message,
              messageString,
              amqpMessageId,
            });
          }
        }

        // Inform that handled.
        log.save('message-from-queue-handled', { messageString, duration: Date.now() - time });
        try {
          this.channels.reading.ack(message);
          log.save('message-from-queue-ack', { messageString });
        } catch (error) {
          const message = error?.message || 'unknown';
          if (message.includes('Channel closed')) {
            log.save('message-from-queue-channel-closed-error', { error: message }, 'error');
            this.reconnect();
          } else {
            log.save('message-from-queue-ack-error', { error: message }, 'error');
          }
        }

        // Decrement consuming count.
        this.consumingCount = Math.max(0, this.consumingCount - 1);
      });
    };

    // Get message from queue.
    this.channels.reading.consume(this.config.readingQueueName, decoratedHandler, {
      noAck: false,
      consumerTag: 'consumer',
    });
  }

  /**
   * Close connection.
   */
  async close() {
    // Set status.
    this.isClosing = true;

    // Close connection.
    return new Promise((resolve) => {
      if (!this.connection) {
        resolve();
      }

      this.connection.close((error) => {
        if (error) {
          log.save('can-not-close-connection', error?.message);
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
    const errorMessage = error?.message;

    // Exit if need it.
    if (ERRORS_TO_RESTART.some(errorMessage)) {
      log.save('app-restart', { error: error?.message });
      this.exitGracefully();
    }
  }

  /**
   * Exit gracefully.
   * @private
   * @param {boolean} forceKill Force kill.
   */
  async exitGracefully(forceKill = true) {
    // Stop consuming.
    this.channels.reading.cancel('consumer');
    log.save('amqp-consumers-stopping', { count: this.consumingCount });

    // Exit anyway after 1 minute.
    if (forceKill) {
      setTimeout(() => process.kill(process.pid, 'SIGTERM'), 60000);
    }

    // Check consuming count.
    if (this.consumingCount > 0) {
      // Wait after 5 seconds.
      setTimeout(() => this.exitGracefully(false), 5000);
      return;
    }

    // Exit.
    (async () => process.exit(1))();
  }
}

module.exports = MessageQueue;
