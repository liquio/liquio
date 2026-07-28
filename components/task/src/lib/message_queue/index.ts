
import _ from 'lodash';
import qs from 'qs';
import { randomUUID } from 'node:crypto';
import amqp from 'amqplib/callback_api';
import { runInAsyncLocalStorage } from '../async_local_storage';

// Constants.
const RETRY_CONNECTION_TIME = 10 * 1000;
const ERRORS_TO_RESTART = ['Error: socket hang up'];
const REDIS_AMQP_KEY_PREFIX = 'amqp-message-id';
const DEFAULT_REDIS_TTL = 60 * 60 * 2;
const RETRY_SEND_MESSAGE_TIME = 60 * 1000;

/**
 * Message queue.
 */
export class MessageQueue {
  channels: any;
  config: any;
  connection: any;
  isClosing: any;
  props: any;
  reconnectTimeout: any;
  totalReconnectCount: any;

  private static singleton: MessageQueue;

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
        errorQueueName1D: `${config.readingQueueName}-errors-1d`
      };
      this.connection = null;
      this.channels = null;
      this.props = props;
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

    if (onInit) onInit();
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
      global.log.save('amqp-starting-reconnect', { totalReconnectCount: this.totalReconnectCount });
      await this.close();
      this.reconnectTimeout = null;
      await this.init();
      this.totalReconnectCount += 1;
      global.log.save('amqp-successfully-reconnected', { totalReconnectCount: this.totalReconnectCount });
    }, this.config.retryConnectionTime || RETRY_CONNECTION_TIME);
  }

  /**
   * Init connection.
   * @private
   */
  async initConnection() {
    // Reconnect on close.
    this.isClosing = false;

    // Create connection.
    return new Promise<void>((resolve) => {
      const amqpConnectionUrl = [this.config.amqpConnection, qs.stringify(this.config.amqpConnectionParams)].filter(Boolean).join('?');
      amqp.connect(amqpConnectionUrl, (error, connection) => {
        // Check error.
        if (error) {
          global.log.save('amqp-connection-error|cannot-create-connection', error, 'error');
          this.reconnect();
          return resolve();
        }

        // Subscribe on connection error events.
        connection.on('error', async (error) => {
          global.log.save('amqp-connection-error', error && error.message, 'error');
        });

        // Subscribe on connection close events.
        connection.on('close', async () => {
          global.log.save('amqp-connection-closed');
          this.reconnect();
          return resolve();
        });

        // Save connection.
        this.connection = connection;
        global.log.save('amqp-connected', true);
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
    const [reading, writing, readingPdf, writingPdf, errors, delayedAutoCommit] = await Promise.all([
      this.createNewChannel(),
      this.createNewChannel(),
      this.createNewChannel(),
      this.createNewChannel(),
      this.createNewChannel(),
      this.createNewChannel()
    ]);
    global.log.save('amqp-channel-opened', true);

    // Save channels.
    this.channels = { reading, writing, readingPdf, writingPdf, errors, delayedAutoCommit };

    // Set channels options.
    this.channels.reading.prefetch(this.config.maxHandlingMessages);
    this.channels.readingPdf.prefetch(this.config.maxHandlingGeneratingPdfMessages);
    this.channels.delayedAutoCommit.prefetch(this.config.maxHandlingMessages);
  }

  /**
   * Init queues.
   * @private
   */
  initQueues() {
    // Assert queues.
    this.channels.reading.assertQueue(this.config.readingQueueName, this.getQueueParams(this.config.readingQueueName));
    this.channels.writing.assertQueue(this.config.writingQueueName, this.getQueueParams(this.config.writingQueueName));

    const generatingPdfReadingQueueName = `${this.config.readingQueueName}-generating-pdf`;
    this.channels.readingPdf.assertQueue(generatingPdfReadingQueueName, this.getQueueParams(generatingPdfReadingQueueName));
    this.channels.writingPdf.assertQueue(generatingPdfReadingQueueName, this.getQueueParams(generatingPdfReadingQueueName));

    // Assert errors queues.
    const ttl10M = 10 * 60 * 1000;
    const ttl1H = 1 * 60 * 60 * 1000;
    const ttl2H = 2 * 60 * 60 * 1000;
    const ttl8H = 8 * 60 * 60 * 1000;
    const ttl1D = 1 * 24 * 60 * 60 * 1000;
    const ttlsAndQueueNames = [
      { ttl: ttl10M, queueName: this.config.errorQueueName10M },
      { ttl: ttl1H, queueName: this.config.errorQueueName1H },
      { ttl: ttl2H, queueName: this.config.errorQueueName2H },
      { ttl: ttl8H, queueName: this.config.errorQueueName8H },
      { ttl: ttl1D, queueName: this.config.errorQueueName1D }
    ];

    ttlsAndQueueNames.forEach(ttlAndQueueName => {
      this.channels.errors.assertQueue(
        ttlAndQueueName.queueName,
        this.getQueueParams(ttlAndQueueName.queueName, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': '',
            'x-message-ttl': ttlAndQueueName.ttl,
            'x-dead-letter-routing-key': this.config.readingQueueName
          }
        })
      );
    });

    /*
     * Assert delayed auto commit queues.
     * Configurable and extendable in message_queue.json.
     *
     * "delayedAutoCommitQueues": {
     *   "1s": 1,
     *   "1m": 60,
     *   "1h": 3600,
     *   "1d": 86400
     * }
    */
    const config: any = this.config || {};
    const { delayedAutoCommitQueues = {}, readingQueueName } = config;

    if (Object.keys(delayedAutoCommitQueues).length) {
      this.channels.delayedAutoCommit.assertQueue(`${readingQueueName}-delayed-auto-commit`, { durable: true }); // Reading queue.

      Object.entries(delayedAutoCommitQueues).forEach(([queueSuffix, xMessageTtlInSeconds]: [string, any]) => { // Writing queues.
        this.channels.delayedAutoCommit.assertQueue(
          `${readingQueueName}-delayed-auto-commit-${queueSuffix}`,
          {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': '',
              'x-dead-letter-routing-key': `${readingQueueName}-delayed-auto-commit`,
              'x-message-ttl': xMessageTtlInSeconds * 1000
            }
          }
        );
      });
    }

  }

  /**
   * Get queue params
   * @private
   */
  getQueueParams(queueName, defaults: any = { durable: true }) {
    const { queueParams = [] } = this.config;

    return queueParams.filter(param => queueName === param.queueName).reduce((acc, { params = {} }) => _.merge(acc, params), defaults);
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
          global.log.save('amqp-channel-error|cannot-create-channel', error, 'error');
          return this.reconnect();
        }

        // Subscribe on channel error events.
        ch.on('error', async (error) => {
          global.log.save('amqp-channel-error', error && error.message, 'error');
        });

        // Subscribe on channel close events.
        ch.on('close', async (data) => {
          global.log.save('amqp-channel-closed', data);
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
   * @param {string} [channel] Channel name.
   * @param {string} [queueName] Queue name.
   * @returns {Promise<boolean>}
   */
  async produce(message, channel = 'writing', queueName = this.config.writingQueueName) {
    let messageString;
    let preparedMessage;
    try {
      // Append message.
      message.amqpMessageId = randomUUID();

      // Prepare message.
      messageString = JSON.stringify(message);
      preparedMessage = Buffer.from(messageString);

      // Send message to queue.
      this.channels[channel].sendToQueue(queueName, preparedMessage, {
        persistent: true
      });
      global.log.save('amqp-message-sent', { messageString });
      return true;
    } catch {
      // Handle error.
      try {
        // Try to send message to queue again.
        global.log.save('amqp-message-try-to-send-again', { messageString });
        await new Promise(resolve => setTimeout(resolve, RETRY_SEND_MESSAGE_TIME));
        this.channels[channel].sendToQueue(queueName, preparedMessage, {
          persistent: true
        });
        global.log.save('amqp-message-sent', { messageString });
        return true;
      } catch (error) {
        // Handle error after retry.
        global.log.save('amqp-send-message-error', { error: error?.message, message }, 'error');
        this.checkErrorAndExitIfNeedIt(error);
      }
    }
  }

  /**
   * Subscribe to consuming.
   * @param {string} [channel] Channel name.
   * @param {string} [queueName] Queue name.
   * @param {function(object)} handler Handler to work with message object.
   */
  subscribeToConsuming(handler, channel = 'reading', queueName = this.config.readingQueueName) {
    // Decorate handler.
    const decoratedHandler = async (message) => {

      runInAsyncLocalStorage(async () => {

        // Convert message.
        const messageString = message.content.toString();
        global.log.save('message-from-queue-to-handle', { messageString });
        const messageObject = JSON.parse(messageString);
        const { amqpMessageId } = messageObject;

        // Try to get amqp message id.
        if (global.redisClientCommonBpmn && global.config?.redis?.redisCommonBpmn?.amqpMessageCache?.isEnabled && amqpMessageId) {
          try {
            const amqpMessageIdFromRedis = await global.redisClientCommonBpmn.get(`${REDIS_AMQP_KEY_PREFIX}.${amqpMessageId} `);
            if (amqpMessageIdFromRedis) {
              try {
                // Inform that handled.
                global.log.save('message-from-queue-handled-from-redis', { messageString });
                this.channels.reading.ack(message);
                global.log.save('message-from-queue-ack-from-redis', { messageString });
              } catch (error) {
                global.log.save('message-from-queue-ack-error-from-redis', error.message, 'error');
              }
              return;
            }
          } catch (error) {
            global.log.save('message-from-queue-id-get-redis-error', error.message, 'error');
          }
        }

        // Handle.
        const isHandled = await handler(messageObject);

        // Check handling status.
        if (!isHandled) {
          // Inform that not handled and exit.
          global.log.save('message-from-queue-not-handled', { messageString });
          this.channels[channel].nack(message);
          return;
        }

        // Inform that handled.
        global.log.save('message-from-queue-handled', { messageString });
        this.channels[channel].ack(message);
        global.log.save('message-from-queue-ack', { messageString });

        // Try to set amqp message id.
        if (global.redisClientCommonBpmn && global.config?.redis?.redisCommonBpmn?.amqpMessageCache?.isEnabled && amqpMessageId) {
          try {
            const ttl = global.config?.redis?.redisCommonBpmn?.amqpMessageCache?.ttl || DEFAULT_REDIS_TTL;
            await global.redisClientCommonBpmn.set(`${REDIS_AMQP_KEY_PREFIX}.${amqpMessageId} `, amqpMessageId, ttl);
          } catch (error) {
            global.log.save('message-from-queue-id-set-redis-error', error.message, 'error');
          }
        }
      });
    };

    try {
      // Get message from queue.
      this.channels[channel].consume(queueName, decoratedHandler, { noAck: false });
    } catch (error) {
      global.log.save('amqp-send-message-error', error?.message, 'error');
      this.checkErrorAndExitIfNeedIt(error);
    }
  }

  /**
   * Close connection.
   */
  async close() {
    if (!this.connection) {
      global.log.save('connection-has-already-been-closed');
      this.isClosing = false;
      return;
    }

    // Set status.
    this.isClosing = true;

    // Close connection.
    return new Promise<void>((resolve) => {
      this.connection.close((error) => {
        if (error) {
          global.log.save('can-not-close-connection', error && error.message);
          this.isClosing = false;
          return resolve();
        }

        global.log.save('connection-closed-by-app');
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
    // Exit if need it.
    if (ERRORS_TO_RESTART.includes(error?.message)) {
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

