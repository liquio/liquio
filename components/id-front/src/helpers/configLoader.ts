import type { ConfigDefaults, RuntimeConfig } from '../types/config';

let config: RuntimeConfig | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reject a `/config.json` whose shape the app cannot work with. A thrown error is
 * handled like a failed fetch: it is logged and the defaults are used.
 */
function assertConfig(value: unknown): asserts value is ConfigDefaults {
  if (!isRecord(value)) {
    throw new TypeError('Configuration must be an object');
  }
  for (const field of ['application', 'variables']) {
    if (value[field] !== undefined && !isRecord(value[field])) {
      throw new TypeError(`Configuration.${field} must be an object`);
    }
  }
  for (const field of ['APP_NAME', 'APP_TITLE', 'APP_ENV', 'BACKEND_URL', 'defaultLanguage']) {
    if (value[field] !== undefined && typeof value[field] !== 'string') {
      throw new TypeError(`Configuration.${field} must be a string`);
    }
  }
}

/**
 * Load configuration from /config.json at runtime
 */
export async function loadConfig(defaults: ConfigDefaults = {}): Promise<RuntimeConfig> {
  // If already loaded, return cached merged config
  if (config) {
    return config;
  }

  let loaded: ConfigDefaults | null = null;

  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    const value: unknown = await response.json();
    assertConfig(value);
    loaded = value;
  } catch (error) {
    console.error('Failed to load configuration:', error);
  }

  // Shallow merge first, then ensure nested objects preserve defaults (at least for `application`)
  config = {
    ...defaults,
    ...(loaded || {}),
    application: { ...(defaults?.application || {}), ...(loaded?.application || {}) },
  };
  return config;
}

/**
 * Get current configuration (must call loadConfig first)
 */
export function getConfig(): RuntimeConfig {
  if (!config) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return config;
}
