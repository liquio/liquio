import { MessageBus } from './bus';
import { MessageBusConfig } from './types';

/**
 * Create a message bus. There is no shared instance: every call returns a new bus.
 * @param {object} config Message bus config.
 * @returns {MessageBus} Message bus.
 */
export function createMessageBus(config: MessageBusConfig): MessageBus {
  return new MessageBus(config);
}
