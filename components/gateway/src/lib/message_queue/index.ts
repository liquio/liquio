import { randomUUID } from 'node:crypto';

import _ from 'lodash';
import amqp from 'amqplib/callback_api';

import { getConfig, getLog, getRedisClient } from '../context';
import { runInAsyncLocalStorage } from '../async_local_storage';

// Constants.
const RETRY_CONNECTION_TIME = 10 * 1000;
const ERRORS_TO_RESTART = ['Error: socket hang up'];
const REDIS_AMQP_KEY_PREFIX = 'amqp-message-id';
const DEFAULT_REDIS_TTL = 60 * 60 * 2;

const MESSAGE_META_KEYS = ['workflowId', 'gatewayTemplateId', 'gatewayId', 'workflowTemplateId', 'debugId', 'amqpMessageId', 'type'];

/**
 * Pick only identifying fields of a queue message, safe to log (no body data).
 * @param {object} messageObject Message object.
 * @returns {object} Meta with the keys that exist and hold a string or number.
 */
export const pickMessageMeta = (messageObject: any): Record<string, string | number> => {
  const meta: Record<string, string | number> = {};
  if (!messageObject || typeof messageObject !== 'object') {
    return meta;
  }
  for (const key of MESSAGE_META_KEYS) {
    const value = messageObject[key];
    if (typeof value === 'string' || typeof value === 'number') {
      meta[key] = value;
    }
  }
  return meta;
};

/**
 * Message queue.
 */
export class MessageQueue {
  static singleton: MessageQueue;
  config: any;
  props: any;
  connection: any;
  channels: any;
  isClosing: boolean;
  reconnectTimeout: any;
  totalReconnectCount: number;

  /**
   * Message queue constructor.
   * @param {object} config Config.
   * @param {string} config.amqpConnection AMQP connection string.
   * @param {number} config.maxHandlingMessages Max handling messages count.
   * @param {string} config.readingQueueName Reading queue name.
   * @param {string} config.writingQueueName Writing queue name.
   */
  constructor(config: any, props: any = {}) {
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
      getLog().save('amqp-starting-reconnect', { totalReconnectCount: this.totalReconnectCount });
      await this.close();
      this.reconnectTimeout = null;
      await this.init();
      this.totalReconnectCount += 1;
      getLog().save('amqp-successfully-reconnected', { totalReconnectCount: this.totalReconnectCount });
    }, this.config.retryConnectionTime || RETRY_CONNECTION_TIME);
  }

  /**
   * Init connection.
   * @private
   */
  async initConnection(): Promise<void> {
    // Reconnect on close.
    this.isClosing = false;

    return new Promise((resolve) => {
      amqp.connect(this.config.amqpConnection, (error: any, connection: any) => {
        // Check error.
        if (error) {
          getLog().save('amqp-connection-error|cannot-create-connection', error);
          // Retry the connect itself instead of reconnect(): reconnect() starts a fresh init() and this promise
          // would never settle, leaving whoever awaits init() (app startup) stuck even after the broker is up.
          return setTimeout(() => {
            if (!this.isClosing) this.initConnection().then(resolve);
          }, this.config.retryConnectionTime || RETRY_CONNECTION_TIME);
        }

        // Subscribe on error events.
        connection.on('error', async (error: any) => {
          getLog().save('amqp-connection-error', error && error.message);
        });

        // Subscribe on connection close events.
        connection.on('close', async () => {
          getLog().save('amqp-connection-closed');
          return this.reconnect();
        });

        // Save connection.
        this.connection = connection;
        getLog().save('amqp-connected', true);
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
    getLog().save('amqp-channel-opened', true);

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
  getQueueParams(queueName: string, defaults: any = { durable: true }) {
    const { queueParams = [] } = this.config;

    return queueParams
      .filter((param: any) => queueName === param.queueName)
      .reduce((acc: any, { params = {} }: any) => _.merge(acc, params), defaults);
  }

  /**
   * Create new channel.
   * @private
   * @returns {Promise<object>}
   */
  async createNewChannel(): Promise<any> {
    return new Promise((resolve) => {
      // Create channel.
      this.connection.createChannel((error: any, ch: any) => {
        // Check error.
        if (error) {
          getLog().save('amqp-channel-error|cannot-create-channel', error);
          return this.reconnect();
        }

        // Subscribe on error events.
        ch.on('error', async (error: any) => {
          getLog().save('amqp-channel-error', error && error.message);
        });

        // Subscribe on channel close events.
        ch.on('close', async (data: any) => {
          getLog().save('amqp-channel-closed', data);
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
  produce(message: any): boolean {
    try {
      // Append message.
      message.amqpMessageId = randomUUID();

      // Prepare message.
      const messageString = JSON.stringify(message);
      const preparedMessage = Buffer.from(messageString);

      // Send mesage to queue.
      this.channels.writing.sendToQueue(this.config.writingQueueName, preparedMessage, {
        persistent: true,
      });
      getLog().save('amqp-message-sent', { ...pickMessageMeta(message), length: messageString.length });
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
  subscribeToConsuming(handler: any) {
    // Decorate handler.
    const decoratedHandler = async (message: any) => {
      runInAsyncLocalStorage(async () => {
        // Convert message.
        const messageString = message.content.toString();

        // Parse message. A malformed message must never crash the process or be redelivered forever.
        let messageObject;
        try {
          messageObject = JSON.parse(messageString);
        } catch (error: any) {
          // Log parse error (no payload, length only).
          getLog().save('message-parse-error', { error: error && error.message, length: messageString.length }, 'error');

          // Inform message handled and return.
          this.discardMessage(message, true);
          return;
        }

        // Only plain objects are valid messages.
        if (messageObject === null || typeof messageObject !== 'object' || Array.isArray(messageObject)) {
          getLog().save('message-parse-error', { error: 'Message is not an object', length: messageString.length }, 'error');
          this.discardMessage(message, true);
          return;
        }

        const { amqpMessageId } = messageObject;
        const messageMeta = pickMessageMeta(messageObject);
        getLog().save('message-from-queue-to-handle', messageMeta);

        try {
          // Try to get amqp message id.
          if (getRedisClient() && getConfig()?.redis?.amqpMessageCache?.isEnabled && amqpMessageId) {
            try {
              const amqpMessageIdFromRedis = await getRedisClient().get(`${REDIS_AMQP_KEY_PREFIX}.${amqpMessageId}`);
              if (amqpMessageIdFromRedis) {
                try {
                  // Inform that handled.
                  getLog().save('message-from-queue-handled-from-redis', messageMeta);
                  this.channels.reading.ack(message);
                  getLog().save('message-from-queue-ack-from-redis', messageMeta);
                } catch (error: any) {
                  getLog().save('message-from-queue-ack-error-from-redis', error.message, 'error');
                  return;
                }
                // Keep the key: a further redelivery must be deduplicated too, the TTL expires it.
                return;
              }
            } catch (error: any) {
              getLog().save('message-from-queue-id-get-redis-error', error.message, 'error');
            }
          }

          // Handle.
          const isHandled = await handler(messageObject);

          // Check handling status.
          if (!isHandled) {
            // Inform that not handled and exit.
            getLog().save('message-from-queue-not-handled', messageMeta);
            this.channels.reading.nack(message);
            return;
          }

          // Inform that handled.
          getLog().save('message-from-queue-handled', messageMeta);
          this.channels.reading.ack(message);
          getLog().save('message-from-queue-ack', messageMeta);

          // Try to set amqp message id.
          if (getRedisClient() && getConfig()?.redis?.amqpMessageCache?.isEnabled && amqpMessageId) {
            try {
              const ttl = getConfig()?.redis?.amqpMessageCache?.ttl || DEFAULT_REDIS_TTL;
              await getRedisClient().set(`${REDIS_AMQP_KEY_PREFIX}.${amqpMessageId}`, amqpMessageId, ttl);
            } catch (error: any) {
              getLog().save('message-from-queue-id-set-redis-error', error.message, 'error');
            }
          }
        } catch (error: any) {
          getLog().save('message-from-queue-handler-error', { ...messageMeta, error: error && error.message }, 'error');
          this.discardMessage(message, false);
        }
      });
    };

    // Get message from queue.
    this.channels.reading.consume(this.config.readingQueueName, decoratedHandler, { noAck: false });
  }

  /**
   * Remove a message from the queue without requeue so a bad message cannot loop.
   * @private
   * @param {object} message AMQP message.
   * @param {boolean} [useAck] Ack instead of nack.
   */
  discardMessage(message: any, useAck = false) {
    try {
      if (useAck) {
        this.channels.reading.ack(message);
      } else {
        this.channels.reading.nack(message, false, false);
      }
    } catch (error: any) {
      getLog().save('message-from-queue-discard-error', error && error.message, 'error');
    }
  }

  /**
   * Close connection.
   */
  async close(): Promise<void> {
    // Set status.
    this.isClosing = true;

    // Close connection.
    return new Promise((resolve) => {
      this.connection.close((error: any) => {
        if (error) {
          getLog().save('can-not-close-connection', error && error.message);
          this.isClosing = false;
          return resolve();
        }

        getLog().save('connection-closed-by-app');
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
  checkErrorAndExitIfNeedIt(error: any) {
    // Define error message.
    const errorMessage = error && error.message;

    // Exit if need it.
    if ((ERRORS_TO_RESTART as any).some(errorMessage)) {
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
