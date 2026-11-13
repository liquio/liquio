import { registerGracefulShutdown, MessageBus } from '@liquio/back-core';

import { getConfig, getLog } from './context';

const DEFAULT_DRAIN_TIMEOUT_MS = 25000;

/**
 * Register graceful shutdown on termination signals.
 * @param {object} services Services to stop.
 * @param {object} [overrides] Test overrides.
 * @returns {function} Unregister function.
 */
export function registerShutdown(
  {
    routerService,
    messageBus,
    reloadInterval,
  }: { routerService: { stop: () => Promise<void> }; messageBus: Pick<MessageBus, 'close'>; reloadInterval?: NodeJS.Timeout },
  overrides: { processLike?: any; exit?: (code: number) => void } = {},
) {
  const drainTimeoutMs = getConfig()?.message_queue?.shutdownDrainTimeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS;
  return registerGracefulShutdown({
    getLog,
    steps: [
      { name: 'timers', run: async () => clearInterval(reloadInterval) },
      { name: 'http', run: () => routerService.stop() },
      { name: 'message-bus', run: () => messageBus.close({ drainTimeoutMs }) },
    ],
    ...overrides,
  });
}
