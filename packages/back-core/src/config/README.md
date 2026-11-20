# Config

Typed, framework-free configuration loader for `@liquio/back-core`, built on `multiconf`. It does not log, cache or render templates.

## What is loaded, in order

1. Config directory: `configPath`, else `CONFIG_PATH`, else `defaultConfigPath`. No path -> `ConfigLoadError`. Each `<name>.json` becomes the key `<name>`; `<name>.json.default` is used only when `<name>.json` is missing.
2. Secrets directory, deep-merged over the config directory: `secretPath`, else `SECRET_PATH`. `secretPath: null` disables it. A path that does not exist on disk is skipped.
3. Env overrides: variables starting with `envPrefix` (exact, e.g. `LIQUIO_CFG_GATEWAY_`). The rest of the name is the top-level key, the value is JSON and replaces the whole key. The value is also stored under the lower-case key. Without `envPrefix` env is ignored.
4. `legacyEnvPrefixes`: older prefixes, applied in order with the same rules. A variable is skipped when its twin with the current prefix is set. Note that a legacy prefix that extends the current one (`A__` with `A_`) also yields a junk `_key`.
5. `transform(raw)`: reshape the object (for example pick an environment section). The result must be a plain object.
6. `defaults`: merged under the config. Nested objects merge, arrays are replaced, `null` wins, `undefined` keeps the default. Without defaults the loaded object is returned as is.
7. `schema`: optional Zod schema. It validates only; the returned config is the merged object, not the parse output.

## Usage

```ts
import { Config, resolveEnvPrefix } from '@liquio/back-core';

interface MyConfig {
  server: { port: number };
  db: { host: string };
}

const config = Config.load<MyConfig>({
  defaultConfigPath: './config',
  envPrefix: resolveEnvPrefix('LIQUIO_CFG_GATEWAY'),
  defaults: { server: { port: 3000 } },
});

config.get('server'); // { port: 3000 }
config.toObject(); // the same object on every call
```

`resolveEnvPrefix(base, suffix = '')` returns `${process.env.LIQUIO_CONFIG_PREFIX || base}_${suffix}`, so `resolveEnvPrefix('LIQUIO_CFG_ADMIN_API', 'HANDLER_')` is `LIQUIO_CFG_ADMIN_API_HANDLER_`. An empty `LIQUIO_CONFIG_PREFIX` falls back to the base.

### NestJS wrapper

```ts
@Injectable()
export class ConfigurationService {
  private readonly config = Config.load<MyConfig>({ defaultConfigPath: './config', envPrefix: 'LIQUIO_CFG_GATEWAY_' });

  get<K extends keyof MyConfig>(key: K): MyConfig[K] {
    return this.config.get(key);
  }
}
```

## Schema

Use a schema to fail fast on a bad config. It does not strip or coerce, so use `z.looseObject({...})` (or `.passthrough()`) to tolerate unknown keys.

```ts
const schema = z.looseObject({ server: z.looseObject({ port: z.number() }) });
Config.load({ defaultConfigPath: './config', schema });
```

## Errors

- `ConfigLoadError` (`code: 'CONFIG_LOAD'`): missing path, unreadable or invalid config, invalid JSON in an env variable, non-object result.
- `ConfigValidationError` (`code: 'CONFIG_VALIDATION'`): `issues` is a list of `{ path, code, message }`.

Messages name the variable or key but never contain config values or secrets.
