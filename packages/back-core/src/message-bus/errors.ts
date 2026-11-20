export type MessageBusErrorCode = 'MESSAGE_BUS_CONFIG' | 'MESSAGE_BUS_UNAVAILABLE' | 'MESSAGE_TOO_LARGE' | 'MESSAGE_BUS_PUBLISH';

/**
 * Base error of the message bus.
 */
export class MessageBusError extends Error {
  public readonly code?: MessageBusErrorCode;
  public readonly cause?: unknown;

  /**
   * @param {string} message Error message.
   * @param {unknown} [cause] Original error.
   */
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'MessageBusError';
    this.cause = cause;
  }
}

/** Invalid configuration or arguments: unknown provider/destination, invalid names, tiers, delay, payload. */
export class MessageBusConfigError extends MessageBusError {
  public readonly code = 'MESSAGE_BUS_CONFIG' as const;

  constructor(message: string) {
    super(message);
    this.name = 'MessageBusConfigError';
  }
}

/** The bus is not connected or is closed. */
export class MessageBusUnavailableError extends MessageBusError {
  public readonly code = 'MESSAGE_BUS_UNAVAILABLE' as const;

  constructor(message = 'Message bus is not connected.') {
    super(message);
    this.name = 'MessageBusUnavailableError';
  }
}

/** The serialized message exceeds the size limit. */
export class MessageTooLargeError extends MessageBusError {
  public readonly code = 'MESSAGE_TOO_LARGE' as const;
  public readonly sizeBytes: number;
  public readonly limitBytes: number;

  /**
   * @param {number} sizeBytes Serialized size.
   * @param {number} limitBytes Limit.
   */
  constructor(sizeBytes: number, limitBytes: number) {
    super(`Message is too large: ${sizeBytes} bytes, limit ${limitBytes} bytes.`);
    this.name = 'MessageTooLargeError';
    this.sizeBytes = sizeBytes;
    this.limitBytes = limitBytes;
  }
}

/** The provider failed to accept the message. */
export class MessageBusPublishError extends MessageBusError {
  public readonly code = 'MESSAGE_BUS_PUBLISH' as const;

  /**
   * @param {string} message Error message.
   * @param {unknown} [cause] Original error.
   */
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'MessageBusPublishError';
  }
}
