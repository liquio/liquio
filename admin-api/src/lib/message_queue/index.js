const amqp = require('amqplib/callback_api');

// Constants.
const RETRY_CONNECTION_TIME = 10 * 1000;

/**
 * Message queue.
 */
class MessageQueue {
  /**
   * Message queue constructor.
   * @param {object} config Config.
   * @param {string} config.amqpConnection AMQP connection string.
   * @param {number} config.maxHandlingMessages Max handling messages count.
   * @param {string} config.writingQueueManager Writing queue manager.
   * @param {string} config.writingQueueTask Writing queue task.
   * @param {string} config.writingQueueEvent Writing queue event.
   * @param {string} config.writingQueueGateway Writing queue gateway.
   */
  constructor(config) {
    // Define singleton.
    if (!MessageQueue.singleton) {
      this.config = config;
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
    await this.initConnection();
    await this.initChannels();
    this.initQueues();
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
          log.save('amqp-connection-error|cannot-create-connection', { url: this.config.amqpConnection, error: error.toString(), stack: error.stack }, 'error');
          return this.reconnect();
        }

        // Subscribe on connection error events.
        connection.on('error', async (error) => {
          log.save('amqp-connection-error', error && error.message, 'error');
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
    this.channels.writing.assertQueue(this.config.writingQueueManager, { durable: true });
    this.channels.writing.assertQueue(this.config.writingQueueTask, { durable: true });
    this.channels.writing.assertQueue(this.config.writingQueueEvent, { durable: true });
    this.channels.writing.assertQueue(this.config.writingQueueGateway, { durable: true });
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
          log.save('amqp-channel-error|cannot-create-channel', error, 'error');
          return this.reconnect();
        }

        // Subscribe on channel error events.
        ch.on('error', async (error) => {
          log.save('amqp-channel-error', error && error.message, 'error');
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
   * @param {string} writingQueueName Writing queue name.
   * @param {{type: string, data: object}} message Message object.
   * @returns {boolean}
   */
  produce(writingQueueName, message) {
    // Prepare message.
    const messageString = JSON.stringify(message);
    const preparedMessage = Buffer.from(messageString);

    // Send mesage to queue.
    this.channels.writing.sendToQueue(this.config[writingQueueName], preparedMessage, {
      persistent: true,
    });
    log.save('amqp-message-sent', { messageString, writingQueueName });
    return true;
  }

  async getAll() {
    return await this.channels.reading.ackAll();
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
}

module.exports = MessageQueue;
