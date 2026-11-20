import { ConsoleLogProvider } from '@liquio/back-core';

// No log.excludeParams is configured anywhere for this component, so this mirrors
// the default exclude list the local sensitiveReplace implementation used to fall back to.
const DEFAULT_EXCLUDE_PARAMS = ['token', 'authorization', 'Authorization', 'oauth-token'];

/**
 * Create console log provider.
 * back-core redacts its default sensitive keys unless `log.disableDefaultRedaction` is true
 * (or env `LOG_DISABLE_DEFAULT_REDACTION=true`).
 * @param {object} [logConfig] Log config section.
 * @returns {ConsoleLogProvider} Provider.
 */
export function createConsoleLogProvider(logConfig?: any): ConsoleLogProvider {
  return new ConsoleLogProvider(logConfig?.console?.name, {
    excludeParams: logConfig?.excludeParams ?? DEFAULT_EXCLUDE_PARAMS,
    disableDefaultRedaction: logConfig?.disableDefaultRedaction === true,
  } as any);
}
