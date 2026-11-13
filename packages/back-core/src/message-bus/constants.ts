export const DEFAULT_PROVIDER = 'rabbitmq';
export const DEFAULT_RECONNECT_DELAY_MS = 10000;
export const DESTINATION_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

/**
 * Body field holding the message id. The name is kept for compatibility with messages already in flight and with stored workflow history.
 */
export const MESSAGE_ID_FIELD = 'amqpMessageId';

export const MESSAGE_BUS_RETRY_DELAYS: Readonly<Record<string, number>> = {
  'errors-10m': 600000,
  'errors-1h': 3600000,
  'errors-2h': 7200000,
  'errors-8h': 28800000,
  'errors-1d': 86400000,
};

/**
 * Read the message id from a serialized message. Never throws and never logs.
 * @param {Buffer} body Serialized message.
 * @returns {string|undefined} Message id.
 */
export function extractMessageId(body: Buffer): string | undefined {
  try {
    const parsed = JSON.parse(body.toString('utf8'));
    const id = parsed && typeof parsed === 'object' ? parsed[MESSAGE_ID_FIELD] : undefined;
    return typeof id === 'string' && id.length > 0 ? id : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Delay for a retry by its postponed-time label.
 * @param {string} [postponedTime] One of 10m, 1h, 2h, 8h, 1d.
 * @returns {number} Delay in milliseconds; one day for anything else.
 */
export function getRetryDelayMs(postponedTime?: string): number {
  return MESSAGE_BUS_RETRY_DELAYS['errors-' + postponedTime] ?? MESSAGE_BUS_RETRY_DELAYS['errors-1d'];
}
