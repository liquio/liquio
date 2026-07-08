const { Client } = require('pg');

// Constants.
const RETRY_CONNECTION_TIME = 10 * 1000; // 10 seconds

/**
 * Pub/Sub.
 */
class PgPubSub {
  subscriptions = new Map();

  /**
   * Create a new pubsub instance
   * @param {PgPubSubConfig} config
   *
   * @typedef {Object} PgPubSubConfig
   * @property {string} host
   * @property {number} port
   * @property {string} database
   * @property {string} username
   * @property {string} password
   * @property {string} [ssl]
   */
  constructor(config) {
    if (!PgPubSub.singleton) {
      this.config = config;
      this.reconnectTimer = null;
      this.client = null;
      this.queryQueue = Promise.resolve();
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      PgPubSub.singleton = this;
    }

    return PgPubSub.singleton;
  }

  /**
   * Get the initialized singleton instance.
   * @returns {PgPubSub}
   */
  static getInstance() {
    return PgPubSub.singleton;
  }

  /**
   * Enqueue SQL query against the shared pg client to avoid concurrent client.query calls.
   * @param {string} sql
   * @returns {Promise<import('pg').QueryResult>}
   */
  enqueueClientQuery(sql) {
    const run = this.queryQueue
      .catch(() => undefined)
      .then(async () => {
        if (!this.client) {
          throw new Error('PgPubSub client is not connected');
        }
        return this.client.query(sql);
      });

    this.queryQueue = run;
    return run;
  }

  /**
   * Connect to the database.
   */
  async connect() {
    const client = new Client({
      user: this.config.username,
      host: this.config.host,
      database: this.config.database,
      password: this.config.password,
      port: this.config.port,
      ssl: this.config.ssl
    });

    client.on('notification', async (msg) => {
      const { channel, payload } = msg;
      const subscriptions = this.subscriptions.get(channel);
      if (subscriptions) {
        try {
          const data = JSON.parse(payload);
          await Promise.all(subscriptions.map((callback) => callback(channel, data)));
        } catch (error) {
          global.log.save('pgpubsub-notification-error', { error: error.message, stack: error.stack });
        }
      }
    });

    client.on('error', (error) => {
      global.log.save('pgpubsub-error', {
        error: error.message,
        stack: error.stack,
        isReconnecting: this.isReconnecting
      });

      if (!this.isReconnecting) {
        this.reconnect();
      }
    });

    client.on('end', () => {
      global.log.save('pgpubsub-connection-ended', { isReconnecting: this.isReconnecting });

      if (!this.isReconnecting && !this.client) {
        this.reconnect();
      }
    });

    await client.connect();

    this.client = client;
    global.log.save('pgpubsub-connected', { message: 'Connected to PostgreSQL' });
  }

  /**
   * Handles reconnection logic.
   */
  async reconnect(){
    if (this.reconnectTimer) return;

    this.isReconnecting = true;

    // End the current client connection.
    try {
      await this.client.end();
      this.client = null;
    } catch (error) {
      global.log.save('pgpubsub-end-client-error', {
        error: error.message,
        stack: error.stack,
      });
    }

    this.reconnectTimer = setInterval(async () => {
      try {
        global.log.save('pgpubsub-starting-to-reconnect', {
          reconnectAttempts: this.reconnectAttempts,
          message: 'Attempting to reconnect...',
        });

        this.reconnectAttempts += 1;
        await this.connect();

        global.log.save('pgpubsub-reconnected-successfully', {
          reconnectAttempts: this.reconnectAttempts,
          message: 'Reconnected successfully'
        });

        // Re-subscribe to channels.
        for (const [channel,] of this.subscriptions.entries()) {
          await this.enqueueClientQuery('LISTEN ' + channel);
          global.log.save('pgpubsub-resubscribed', { channel });
        }

        // Stop reconnection process.
        clearInterval(this.reconnectTimer);
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
      } catch (error) {
        global.log.save('pgpubsub-failed-to-reconnect', {
          error: error.message,
          stack: error.stack,
          reconnectAttempts: this.reconnectAttempts,
        });
      }
    }, this.config.retryConnectionTime || RETRY_CONNECTION_TIME);
  }

  /**
   * Cleanup timers and database connection.
   */
  async cleanup() {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isReconnecting = false;
    this.reconnectAttempts = 0;

    try {
      if (this.client) {
        await this.client.end();
      }
    } catch (error) {
      global.log.save('pgpubsub-cleanup-error', {
        error: error.message,
        stack: error.stack,
      });
    } finally {
      this.client = null;
      this.queryQueue = Promise.resolve();
    }
  }

  /**
   * Subscribes to a new channel and associates a callback function.
   * @param {string} channel The name of the channel to subscribe to.
   * @param {Function} callback Callback to execute that accepts the channel name and the message data.
   */
  async subscribe(channel, callback) {
    const channelName = String(channel);
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      this.subscriptions.set(channelName, subscription.concat(callback));
    } else {
      this.subscriptions.set(channelName, [callback]);
      await this.enqueueClientQuery('LISTEN ' + channelName);
    }
    global.log.save('pgpubsub-subscribed', { channel: channelName });
  }

  /**
   * Unsubscribe from a channel (removes all channel callbacks).
   * @param {string} channel The name of the channel to unsubscribe from.
   */
  async unsubscribe(channel) {
    const channelName = String(channel);
    if (this.subscriptions.has(channelName)) {
      await this.enqueueClientQuery('UNLISTEN ' + channelName);
      this.subscriptions.delete(channelName);
    }
    global.log.save('pgpubsub-unsubscribed', { channel: channelName });
  }
}

module.exports = PgPubSub;
