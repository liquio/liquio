import { Config, resolveEnvPrefix } from '@liquio/back-core';

export const DEFAULT_CONFIG_PATH = '../config/gateway';
export const DEFAULT_ENV_PREFIX = 'LIQUIO_CFG_GATEWAY';

/**
 * Load the gateway config (config dir, optional SECRET_PATH, env overrides).
 * @param {string} [configPath] Path to config directory (overrides CONFIG_PATH and the default).
 * @returns {object} Config object.
 */
export function loadGatewayConfig(configPath?: string): Record<string, any> {
  return Config.load({
    configPath,
    defaultConfigPath: DEFAULT_CONFIG_PATH,
    envPrefix: resolveEnvPrefix(DEFAULT_ENV_PREFIX),
  }).toObject();
}
