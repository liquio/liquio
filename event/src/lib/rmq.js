const amqp = require('amqplib/callback_api');
const axios = require('axios');
const uuid = require('uuid-random');

const { prepareAxiosErrorToLog } = require('./helpers');

/**
 * RMQ.
 */
class Rmq {
  /**
   * RMQ constructor.
   * @param {string} [connectorName] Connector name.
   */
  constructor(connectorName = 'default') {
    // Create singletons container if need it.
    if (!Rmq.singleton) {
      Rmq.singleton = {};
    }

    // Singleton.
    if (!Rmq.singleton[connectorName]) {
      // Define singleton.
      Rmq.singleton[connectorName] = this;
    }

    // Return singleton.
    return Rmq.singleton[connectorName];
  }

  /**
   * Send request and wait response.
   * @param {string} id Message ID.
   * @param {object} request Request object.
   * @param {string} event Event.
   * @param {boolean} [isLoggingMessage = true] Is logging RMQ message.
   * @return {Promise<array>}
   */
  async sendRequestAndWaitResponse(id, request, event, isLoggingMessage = true) {
    // Send message.
    let message = {
      event,
      meta: {
        date: new Date().toISOString(),
      },
      payload: {
        uuid: `${id}`,
        request: { ...request },
      },
    };
    if (this.options.addRequestPersonAndRepresentative) {
      message.payload.request.person = request;
      message.payload.request.representative = request;
    }
    try {
      await this.produce(message, isLoggingMessage);
    } catch (error) {
      log.save('rmq-send-and-wait-error-request-error', { message, error: error && error.message });
      throw error;
    }

    // Wait response.
    let result;
    try {
      result = await this.getIncomingMessageById(id);
    } catch (error) {
      log.save('rmq-send-and-wait-error-response-error', { message, error: error && error.message });
    }

    // Return response.
    return result;
  }

  /**
   * Send request and wait response via decorator.
   * @param {object} options Options.
   */
  async sendRequestAndWaitResponseViaDecorator({
    id,
    request,
    event,
    rmqDecoratorUrl,
    rmqDecoratorToken,
    writingQueueName,
    writingExchangeName,
    persistent,
    readingQueueName,
    getIncomingMessageTimeout,
  }) {
    // Generate UUID.
    const generatedUuid = uuid();
    const mergedId = `${id}-${generatedUuid}`;

    // Prepare message.
    let message = {
      event,
      meta: {
        date: new Date().toISOString(),
      },
      payload: {
        uuid: `${mergedId}`,
        request: { ...request },
      },
    };
    if (this.options.addRequestPersonAndRepresentative) {
      message.payload.request.person = request;
      message.payload.request.representative = request;
    }
    const rmqRestMessage = {
      sendQueueName: writingQueueName,
      sendExchange: writingExchangeName,
      sendOptions: {
        persistent,
      },
      consumeQueueName: readingQueueName,
      consumeRoutingKey: readingQueueName,
      data: message,
    };
    const requestOptions = {
      url: rmqDecoratorUrl,
      method: 'POST',
      timeout: getIncomingMessageTimeout || 40000,
      headers: {
        Authorization: rmqDecoratorToken,
      },
      data: rmqRestMessage,
    };

    // Send message.
    let response;
    try {
      log.save('rmq-decorator-request', { requestOptions });
      response = (await axios(requestOptions)).data;
      log.save('rmq-decorator-response', { requestOptions, response });
    } catch (error) {
      log.save(
        'rmq-decorator-error',
        {
          requestOptions,
          ...prepareAxiosErrorToLog(error),
        },
        'error',
      );
    }

    return response.data;
  }

  /**
   * Init.
   * @param {object} options Options.
   * @param {string} options.amqpConnection AMQP connection string.
   * @param {string} options.readingQueueName Reading queue name.
   * @param {string} options.writingQueueName Writing queue name.
   * @param {string} options.readingExchangeName Reading exchange name.
   * @param {string} options.writingExchangeName Writing exchange name.
   * @param {string} options.sender Sender.
   * @param {boolean} options.readingDurable Reading durable indicator.
   * @param {boolean} options.writingDurable Writing durable indicator.
   * @param {boolean} options.persistent Persistent indicator.
   * @param {number} options.getIncomingMessageInterval Get incoming message interval.
   * @param {number} options.getIncomingMessageTimeout Get incoming message TTL.
   * @param {number} options.readingXMessageTtl RMQ reading argument `x-message-ttl`.
   * @param {number} options.writingXMessageTtl RMQ writing argument `x-message-ttl`.
   * @param {number} options.maxHandlingMessages Max handling messages.
   * @param {boolean} options.useRmqDecorator Use RMQ decorator indicator.
   */
  async init(options) {
    // Check if already initialized.
    if (this.initialized) return;

    // Define params.
    const {
      amqpConnection,
      readingQueueName,
      writingQueueName,
      readingExchangeName,
      writingExchangeName,
      sender,
      readingDurable = true,
      writingDurable = true,
      readingExchangeDurable = true,
      persistent = true,
      getIncomingMessageInterval = 1000,
      getIncomingMessageTimeout = 20000,
      readingXMessageTtl,
      readingXQueueType,
      writingXMessageTtl,
      writingXQueueType,
      maxHandlingMessages = 2,
      addRequestPersonAndRepresentative = true,
      useRmqDecorator = false,
    } = options;
    this.options = {
      amqpConnection,
      readingQueueName,
      writingQueueName,
      readingExchangeName,
      writingExchangeName,
      sender,
      readingDurable,
      writingDurable,
      readingExchangeDurable,
      persistent,
      getIncomingMessageInterval,
      getIncomingMessageTimeout,
      readingXMessageTtl,
      readingXQueueType,
      writingXMessageTtl,
      writingXQueueType,
      maxHandlingMessages,
      addRequestPersonAndRepresentative,
      useRmqDecorator,
    };

    // Check if just RMQ decorator should be initialized.
    if (useRmqDecorator) return;

    // Init RMQ.
    this.incomingMessages = new Map();
    await this.initConnection();
    await this.initChannels();
    await this.initQueues();
    this.subscribeToConsuming(this.consumingHandler.bind(this));
    this.initialized = true;
  }

  /**
   * Init connection.
   * @private
   */
  async initConnection() {
    return new Promise((resolve, reject) => {
      amqp.connect(this.options.amqpConnection, (error, connection) => {
        // Check error.
        if (error) {
          log.save('rmq-connection-error', (error && error.message) || error, 'error');
          this.initialized = false;
          return reject(error);
        }

        // Subscribe on error events.
        connection.on('error', async (error) => {
          log.save('rmq-connection-error', (error && error.message) || error, 'error');
          this.initialized = false;
          return reject(error);
        });
        connection.on('close', async () => {
          log.save('rmq-connection-closed');
          this.initialized = false;
          return reject(error);
        });

        // Save connection.
        this.connection = connection;
        log.save('rmq-connected', true);
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
    log.save('rmq-channel-opened', true);

    // Save channels.
    this.channels = { reading, writing };

    // Set channels options.
    this.channels.reading.prefetch(this.options.maxHandlingMessages);
  }

  /**
   * Init queues.
   * @private
   */
  async initQueues() {
    // Assert queues.
    this.channels.reading.assertExchange(this.options.readingExchangeName, 'direct', { durable: this.options.readingExchangeDurable });

    const readingArguments = {};
    if (this.options.readingXMessageTtl) {
      readingArguments['x-message-ttl'] = this.options.readingXMessageTtl;
    }
    if (this.options.readingXQueueType) {
      readingArguments['x-queue-type'] = this.options.readingXQueueType;
    }
    this.channels.reading.assertQueue(this.options.readingQueueName, {
      durable: this.options.readingDurable,
      arguments: readingArguments,
    });

    const writingArguments = {};
    if (this.options.writingXMessageTtl) {
      writingArguments['x-message-ttl'] = this.options.writingXMessageTtl;
    }
    if (this.options.writingXQueueType) {
      writingArguments['x-queue-type'] = this.options.writingXQueueType;
    }
    this.channels.writing.assertQueue(this.options.writingQueueName, {
      durable: this.options.writingDurable,
      arguments: writingArguments,
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
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
          log.save('rmq-connection-error', (error && error.message) || error, 'error');
          this.initialized = false;
          return reject(error);
        }

        // Subscribe on error events.
        ch.on('error', async (error) => {
          log.save('rmq-channel-error', error && error.message, 'error');
          this.initialized = false;
          return reject(error);
        });
        ch.on('close', async (data) => {
          log.save('rmq-channel-closed', data);
          this.initialized = false;
          return reject(error);
        });

        // Return created channel.
        resolve(ch);
      });
    });
  }

  /**
   * Produce.
   * @param {object} message Message object.
   * @param {boolean} [isLoggingMessage = true] Is logging RMQ message.
   * @returns {boolean} Is sent indicator.
   */
  async produce(message, isLoggingMessage = true) {
    try {
      // Prepare message.
      const messageString = JSON.stringify(message);
      const preparedMessage = Buffer.from(messageString);

      // Send message to queue.
      await this.channels.writing.publish(this.options.writingExchangeName, this.options.writingQueueName, preparedMessage, {
        persistent: this.options.persistent,
        correlationId: message?.payload?.uuid,
        replyTo: this.options?.replyTo,
      });
      log.save('rmq-message-produce', { messageString: isLoggingMessage ? messageString : '****' });
      return true;
    } catch (error) {
      log.save('rmq-message-produce-error', (error && error.message) || error, 'error');
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
      // Convert message.
      const messageString = message.content.toString();
      log.save('message-from-queue-to-handle', { messageString });
      const messageObject = JSON.parse(messageString);

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
    };

    // Get message from queue.
    this.channels.reading.bindQueue(this.options.readingQueueName, this.options.readingExchangeName, this.options.readingQueueName);
    this.channels.reading.consume(this.options.readingQueueName, decoratedHandler, { noAck: false });
  }

  /**
   * Consuming handler.
   * @param {object} message Message object.
   * @returns {Promise<boolean>} Is handled indicator.
   */
  async consumingHandler(message = {}) {
    // Check message.
    const { payload: { uuid } = {} } = message;
    if (!uuid) {
      return false;
    }

    // Append incoming messages.
    if (global.redisClient) {
      const getIncomingMessageTimeoutInSeconds = this.options.getIncomingMessageTimeout / 1e3;
      await global.redisClient.set(uuid, message, getIncomingMessageTimeoutInSeconds);
    } else {
      this.incomingMessages.set(uuid, message);
    }
    log.save('rmq-incoming-message', { count: this.incomingMessages.size, message });
    return true;
  }

  /**
   * Get incoming message by ID.
   * @param {string} id Message ID.
   * @returns {Promise<object>} Incoming message.
   */
  async getIncomingMessageById(id) {
    return new Promise((resolve, reject) => {
      // Try to get with interval.
      const getInterval = setInterval(async () => {
        const message = global.redisClient ? await global.redisClient.getObject(id) : this.incomingMessages.get(id);
        if (message) {
          clearInterval(getInterval);
          resolve(message);
          if (global.redisClient) {
            await global.redisClient.delete(id);
          } else {
            this.incomingMessages.delete(id);
          }
        }
      }, this.options.getIncomingMessageInterval);

      // Drop after timeout.
      setTimeout(() => {
        if (!getInterval || getInterval._destroyed) {
          return;
        }
        clearInterval(getInterval);
        reject(new Error('Cant get message by ID during timeout.'));
      }, this.options.getIncomingMessageTimeout);
    });
  }

  /**
   * Close connection.
   */
  async close() {
    return new Promise((resolve) => {
      this.connection.close((error) => {
        if (error) {
          log.save('can-not-close-connection', error && error.message);
          return resolve();
        }

        log.save('connection-closed-by-app');
        resolve();
      });
    });
  }
}

module.exports = Rmq;
