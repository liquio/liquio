import { ConsoleLogProvider } from '@liquio/back-core';

/**
 * Create console log provider.
 * back-core redacts its default sensitive keys unless `log.disableDefaultRedaction` is true
 * (or env `LOG_DISABLE_DEFAULT_REDACTION=true`).
 * @param {object} [logConfig] Log config section.
 * @returns {ConsoleLogProvider} Provider.
 */
export function createConsoleLogProvider(logConfig?: any): ConsoleLogProvider {
  return new ConsoleLogProvider(logConfig?.console?.name, {
    excludeParams: logConfig?.excludeParams,
    disableDefaultRedaction: logConfig?.disableDefaultRedaction === true,
  } as any);
}
