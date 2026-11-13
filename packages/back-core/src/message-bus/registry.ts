import { MessageBusProviderFactory } from './provider';
import { createMemoryProvider } from './providers/memory';

const providers = new Map<string, MessageBusProviderFactory>();

/**
 * Register a provider factory. Overwrites an existing registration.
 * @param {string} name Provider name.
 * @param {function} factory Provider factory.
 */
export function registerMessageBusProvider(name: string, factory: MessageBusProviderFactory): void {
  providers.set(name, factory);
}

/**
 * Get a provider factory.
 * @param {string} name Provider name.
 * @returns {function|undefined} Provider factory, undefined if unknown.
 */
export function getMessageBusProviderFactory(name: string): MessageBusProviderFactory | undefined {
  return providers.get(name);
}

registerMessageBusProvider('memory', createMemoryProvider);
