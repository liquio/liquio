/**
 * Env override prefix used by components that honour LIQUIO_CONFIG_PREFIX.
 * Returns `${process.env.LIQUIO_CONFIG_PREFIX || defaultBase}_${suffix}`.
 * Example: resolveEnvPrefix('LIQUIO_CFG_GATEWAY') -> 'LIQUIO_CFG_GATEWAY_';
 *          resolveEnvPrefix('LIQUIO_CFG_ADMIN_API', 'HANDLER_') -> 'LIQUIO_CFG_ADMIN_API_HANDLER_'.
 *
 * @param {string} defaultBase Base used when LIQUIO_CONFIG_PREFIX is unset or empty.
 * @param {string} [suffix] Text appended after the underscore.
 * @returns {string} Env prefix.
 */
export function resolveEnvPrefix(defaultBase: string, suffix = ''): string {
  return `${process.env.LIQUIO_CONFIG_PREFIX || defaultBase}_${suffix}`;
}
