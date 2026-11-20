import { registerGracefulShutdown } from '@liquio/back-core';

import { getConfig, getLog } from './context';

/**
 * Register graceful shutdown on termination signals.
 * @param {object} params Params.
 * @param {object} params.core Task core.
 * @param {object} [overrides] Overrides for tests.
 * @returns {Function} Unregister function.
 */
export function registerShutdown(
  { core }: { core: { stop: (drainTimeoutMs?: number) => Promise<void> } },
  overrides: { processLike?: any; exit?: (code: number) => void } = {},
) {
  const drainTimeoutMs = getConfig()?.message_queue?.shutdownDrainTimeoutMs ?? 25000;
  return registerGracefulShutdown({
    getLog,
    steps: [{ name: 'task-core', run: () => core.stop(drainTimeoutMs) }],
    ...overrides,
  });
}
