import * as fs from 'node:fs';

import { cloneDeep, mergeWith } from 'lodash';
import Multiconf from 'multiconf';
import type { ZodType } from 'zod';

import { ConfigLoadError, ConfigValidationError } from './errors';

export type ConfigDefaults<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? ConfigDefaults<T[K]> : T[K];
};

export interface ConfigObjectOptions<TConfig extends object> {
  /** Reshape the raw object (e.g. pick an environment section) before defaults and validation. */
  transform?: (raw: Record<string, any>) => unknown;
  /** Merged under the config: values from the config win. */
  defaults?: ConfigDefaults<TConfig>;
  /** Optional Zod schema. Validates only; the returned config is not replaced by the parse output. */
  schema?: ZodType<TConfig>;
}

export interface ConfigLoadOptions<TConfig extends object> extends ConfigObjectOptions<TConfig> {
  /** Config directory. Wins over CONFIG_PATH. */
  configPath?: string;
  /** Used when neither configPath nor CONFIG_PATH is set. */
  defaultConfigPath?: string;
  /** Secrets directory merged over the config dir. undefined: process.env.SECRET_PATH. null: none. Skipped when it doesn't exist on disk. */
  secretPath?: string | null;
  /** Exact env override prefix passed to multiconf (e.g. 'LIQUIO_CFG_GATEWAY_'). Omit for no env overrides. */
  envPrefix?: string;
  /** Older prefixes still honoured. */
  legacyEnvPrefixes?: string[];
}

/**
 * Keeps the text before the first line break.
 *
 * @param {string} text Text.
 * @returns {string} First line.
 */
function firstLine(text: string): string {
  return String(text).split('\n')[0];
}

/**
 * Applies legacy env prefixes on top of the loaded object.
 *
 * @param {Record<string, any>} raw Loaded object, mutated.
 * @param {ConfigLoadOptions<any>} options Load options.
 */
function applyLegacyPrefixes(raw: Record<string, any>, options: ConfigLoadOptions<any>): void {
  for (const legacy of options.legacyEnvPrefixes || []) {
    for (const name of Object.keys(process.env)) {
      if (!name.startsWith(legacy)) {
        continue;
      }
      const key = name.slice(legacy.length);
      if (options.envPrefix !== undefined && process.env[options.envPrefix + key] !== undefined) {
        continue;
      }
      let value: unknown;
      try {
        value = JSON.parse(process.env[name] as string);
      } catch {
        throw new ConfigLoadError(`Can't parse env config "${name}".`);
      }
      raw[key] = value;
      raw[key.toLowerCase()] = value;
    }
  }
}

/** Typed configuration: config dir, secret dir and env overrides merged by multiconf, with optional defaults and schema. */
export class Config<TConfig extends object = Record<string, any>> {
  private constructor(private readonly value: TConfig) {}

  /**
   * Loads the configuration from disk and env.
   *
   * @param {ConfigLoadOptions<TConfig>} [options] Load options.
   * @returns {Config<TConfig>} Config.
   * @throws {ConfigLoadError} When the configuration can't be loaded.
   * @throws {ConfigValidationError} When the schema rejects the configuration.
   */
  static load<TConfig extends object = Record<string, any>>(options: ConfigLoadOptions<TConfig> = {}): Config<TConfig> {
    const configPath = options.configPath ?? (process.env.CONFIG_PATH || options.defaultConfigPath);
    if (!configPath) {
      throw new ConfigLoadError('Config path is not set: pass configPath/defaultConfigPath or set CONFIG_PATH.');
    }

    const secretPath = options.secretPath === undefined ? process.env.SECRET_PATH : options.secretPath;
    const dirs = [configPath, ...(secretPath && fs.existsSync(secretPath) ? [secretPath] : [])];

    let raw: Record<string, any>;
    try {
      raw = Multiconf.get(dirs, options.envPrefix) as Record<string, any>;
    } catch (err) {
      throw new ConfigLoadError(err instanceof Error ? firstLine(err.message) : 'Unable to load configuration');
    }

    applyLegacyPrefixes(raw, options);

    return Config.fromObject<TConfig>(raw, options);
  }

  /**
   * Builds a config from an already loaded object.
   *
   * @param {unknown} raw Raw object.
   * @param {ConfigObjectOptions<TConfig>} [options] Options.
   * @returns {Config<TConfig>} Config.
   * @throws {ConfigLoadError} When the result is not an object.
   * @throws {ConfigValidationError} When the schema rejects the configuration.
   */
  static fromObject<TConfig extends object = Record<string, any>>(raw: unknown, options: ConfigObjectOptions<TConfig> = {}): Config<TConfig> {
    let value: any = options.transform ? options.transform(raw as Record<string, any>) : raw;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new ConfigLoadError('Config must be an object.');
    }

    if (options.defaults) {
      value = mergeWith({}, cloneDeep(options.defaults), value, (_dst: unknown, src: unknown) => (Array.isArray(src) ? src : undefined));
    }

    if (options.schema) {
      const result = options.schema.safeParse(value);
      if (!result.success) {
        throw new ConfigValidationError(result.error.issues.map((i) => ({ path: i.path.map(String).join('.'), code: i.code, message: i.message })));
      }
    }

    return new Config<TConfig>(value as TConfig);
  }

  /**
   * @param {K} key Top-level key.
   * @returns {TConfig[K]} Value.
   */
  get<K extends keyof TConfig>(key: K): TConfig[K] {
    return this.value[key];
  }

  /**
   * The loaded config object. Same reference on every call.
   *
   * @returns {TConfig} Config object.
   */
  toObject(): TConfig {
    return this.value;
  }
}
