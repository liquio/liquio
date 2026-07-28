import { Client, ClientConfig } from 'pg';

import Log from './log';

interface PgPubSubConfig extends ClientConfig {
  username: string;
  host: string;
  database: string;
  password: string;
  port: number;
  ssl?: boolean;
  retryConnectionTime?: number;
}

export type PubSubCallbackData = { id: number; table: string; action: 'INSERT' | 'UPDATE' | 'DELETE' };
export type PubSubCallback = (channel: string, data: PubSubCallbackData) => void;

// Constants.
const RETRY_CONNECTION_TIME = 10 * 1000; // 10 seconds

/**
 * Pub/Sub.
 */
export class PgPubSub {
  private static singleton: PgPubSub;

  private readonly config: PgPubSubConfig;

  private client: Client | null;

  private reconnectTimer: NodeJS.Timeout | null;

  private reconnectAttempts: number;

  private isReconnecting: boolean;

  private subscriptions: Map<string, PubSubCallback[]> = new Map();

  private log: Log;

  constructor(config: PgPubSubConfig) {
    if (!PgPubSub.singleton) {
      this.log = Log.getInstance();
      this.config = config;
      this.reconnectTimer = null;
      this.client = null;
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
  static getInstance(): PgPubSub {
    return PgPubSub.singleton;
  }

  /**
   * Connect to the database.
   */
  async connect(): Promise<void> {
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
          this.log.save('pgpubsub-notification-error', { error: error.message, stack: error.stack });
        }
      }
    });

    client.on('error', (error) => {
      this.log.save('pgpubsub-error', {
        error: error.message,
        stack: error.stack,
        isReconnecting: this.isReconnecting
      });

      if (!this.isReconnecting) {
        this.reconnect();
      }
    });

    client.on('end', () => {
      this.log.save('pgpubsub-connection-ended', { isReconnecting: this.isReconnecting });

      if (!this.isReconnecting && !this.client) {
        this.reconnect();
      }
    });

    await client.connect();

    this.client = client;
    this.log.save('pgpubsub-connected', { message: 'Connected to PostgreSQL' });
  }

  /**
   * Handles reconnection logic.
   */
  async reconnect(): Promise<void> {
    if (this.reconnectTimer) return;

    this.isReconnecting = true;

    // End the current client connection.
    try {
      await this.client.end();
      this.client = null;
    } catch (error) {
      this.log.save('pgpubsub-end-client-error', {
        error: error.message,
        stack: error.stack
      });
    }

    this.reconnectTimer = setInterval(async () => {
      try {
        this.log.save('pgpubsub-starting-to-reconnect', {
          reconnectAttempts: this.reconnectAttempts,
          message: 'Attempting to reconnect...'
        });

        this.reconnectAttempts += 1;
        await this.connect();

        this.log.save('pgpubsub-reconnected-successfully', {
          reconnectAttempts: this.reconnectAttempts,
          message: 'Reconnected successfully'
        });

        // Re-subscribe to channels.
        for (const [channel] of this.subscriptions.entries()) {
          await this.client.query('LISTEN ' + channel);
          this.log.save('pgpubsub-resubscribed', { channel });
        }

        // Stop reconnection process.
        clearInterval(this.reconnectTimer);
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
      } catch (error) {
        this.log.save('pgpubsub-failed-to-reconnect', {
          error: error.message,
          stack: error.stack,
          reconnectAttempts: this.reconnectAttempts
        });
      }
    }, this.config.retryConnectionTime || RETRY_CONNECTION_TIME);
  }

  /**
   * Subscribes to a new channel and associates a callback function.
   * @param channel The name of the channel to subscribe to.
   * @param callback Callback to execute when a notification is received.
   */
  async subscribe(channel: string, callback: PubSubCallback): Promise<void> {
    await this.client.query('LISTEN ' + String(channel));
    const subscription = this.subscriptions.get(channel);
    if (subscription) {
      this.subscriptions.set(channel, subscription.concat(callback));
    } else {
      this.subscriptions.set(channel, [callback]);
    }
    this.log.save('pgpubsub-subscribed', { channel });
  }

  /**
   * Unsubscribe from a channel (removes all channel callbacks).
   * @param channel The name of the channel to unsubscribe from.
   */
  async unsubscribe(channel: string): Promise<void> {
    await this.client.query('UNLISTEN ' + String(channel));
    this.subscriptions.delete(channel);
    this.log.save('pgpubsub-unsubscribed', { channel });
  }
}
