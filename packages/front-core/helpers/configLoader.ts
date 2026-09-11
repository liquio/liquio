import type { ConfigDefaults, RuntimeConfig } from 'core/types/config';
import { assertOptionalFields, assertRecord } from './contractValidation';

let config: RuntimeConfig | null = null;

function assertConfig(value: unknown): asserts value is ConfigDefaults {
  assertRecord(value, 'Configuration');
  assertOptionalFields(
    value,
    [
      'backendUrl',
      'authLink',
      'idAuthLink',
      'clientId',
      'defaultLanguage',
      'defaultRoute',
      'adminPanelUrl',
      'cabinetUrl',
    ],
    'string',
    'Configuration',
  );
  assertOptionalFields(
    value,
    ['disableCabinetState', 'showPhone'],
    'boolean',
    'Configuration',
  );
  assertOptionalFields(value, ['sessionLifeTime'], 'number', 'Configuration');
  if (
    value.storageType !== undefined &&
    value.storageType !== 'local' &&
    value.storageType !== 'session'
  ) {
    throw new TypeError('Configuration.storageType must be local or session');
  }
  if (value.application !== undefined) {
    assertRecord(value.application, 'Configuration.application');
    assertOptionalFields(
      value.application,
      ['name', 'environment', 'type', 'version'],
      'string',
      'Configuration.application',
    );
  }
}

/** Load once; runtime application fields override defaults without discarding siblings. */
export async function loadConfig(
  defaults: ConfigDefaults = {},
): Promise<RuntimeConfig> {
  if (config) return config;
  assertConfig(defaults);
  let runtime: ConfigDefaults = {};
  try {
    const response = await fetch('/config.json');
    if (!response.ok)
      throw new Error(`Failed to load config: ${response.status}`);
    const value: unknown = await response.json();
    assertConfig(value);
    runtime = value;
  } catch (error) {
    console.error('Failed to load configuration:', error);
  }

  config = {
    ...defaults,
    ...runtime,
    application: { ...defaults.application, ...runtime.application },
  };
  return config;
}

export function getConfig(): RuntimeConfig {
  if (!config)
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  return config;
}
