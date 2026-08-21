# @liquio/plugin-sdk

Provider/plugin interfaces and runtime loader shared by Liquio backend components (`task`, `event`, `external-reader`). This package is what you build against if you're writing a Liquio plugin, and it's what those components use internally to discover, validate, and load plugins at startup.

A plugin is an ordinary npm package that:
- exports a class extending one of the three provider base classes below,
- declares a `liquioPlugin` block in its `package.json` describing what kind of plugin it is,
- gets listed in a host component's `plugins.json` config,
- gets installed into a shared volume at container startup by [`@liquio/plugin-installer`](../plugin-installer),
- and is `require()`'d and instantiated by the host's `PluginLoader` at runtime.

## Plugin kinds

There are three provider base classes, one per plugin kind. Pick the one matching what you're integrating:

| Kind (`liquioPlugin.kind`) | Base class | Used by |
| --- | --- | --- |
| `event-external-service` | `EventExternalServiceProvider` | `event` |
| `task-payment-provider` | `TaskPaymentProvider` | `task` |
| `external-reader-provider` | `ExternalReaderProvider` | `external-reader` |

All three extend `BasePlugin`, which gives you:

```ts
export interface PluginContext {
  log: PluginLogger;                        // structured logging (see below)
  pluginConfig: Record<string, unknown>;     // this plugin's `options` from plugins.json
}

export abstract class BasePlugin<TOptions = Record<string, unknown>> {
  protected readonly options: TOptions;      // same object as context.pluginConfig, typed
  protected readonly context: PluginContext;

  constructor(context: PluginContext, options: TOptions) { ... }

  async onInit(): Promise<void> {}   // called once, right after construction
  async onDestroy(): Promise<void> {} // reserved for future use - not currently invoked by the loader
}
```

`this.options` and `this.context.pluginConfig` carry the same data — `this.options` is just the typed version, generic over whatever options shape your plugin declares.

### `EventExternalServiceProvider`

```ts
export interface ExternalServiceSendResult {
  request: unknown;
  response: unknown;
  isDone: boolean;
}

export interface ExternalServiceSendContext {
  filestorage?: unknown;
  documentModel?: unknown;
  taskModel?: unknown;
  workflowId?: string;
}

export abstract class EventExternalServiceProvider<TOptions = Record<string, unknown>> extends BasePlugin<TOptions> {
  abstract send(
    data: unknown,
    isTest?: boolean,
    ctx?: ExternalServiceSendContext,
  ): Promise<ExternalServiceSendResult>;
}
```

Implement `send()`. See [`@liquio/event-xroad-plugin`](../event-xroad-plugin) for a real example.

### `TaskPaymentProvider`

A full payment gateway integration. Implement all of:

```ts
calculatePayment(data: unknown): Promise<unknown>
handleStatus(data, providerOptions, status: string, queryParamsObject, headersObject, checkPrevTransaction?: boolean): Promise<unknown>
confirmBySmsCode(providerOptions, calculatedData, smsCode: string): Promise<unknown>
cancelOrder(providerOptions, orderId: string, transactionId: string, sessionId: string): Promise<unknown>
unHoldOrder(data: unknown): Promise<unknown>
checkStatus(providerOptions, sessionId: string, invoiceId: string): Promise<unknown>
getPaymentReceiptInfo(args: { paymentSystemParams: unknown; orderId: string }): Promise<unknown>
getPaymentReceiptFiles(args: { paymentSystemParams; orderId; receiptFormat; paymentControlSchema }): Promise<Array<{ fileBuffer: ArrayBuffer; contentType: string }>>
getWithdrawalFundsStatus(args: { paymentSystemParams; orderId }): Promise<unknown>
sendCheckRequest(providerOptions: unknown): Promise<unknown>
```

### `ExternalReaderProvider`

A registry pattern rather than a fixed method set — register whichever read methods your plugin exposes:

```ts
export type ProviderMethod = (args: ProviderMethodArgs) => Promise<unknown>;
export interface ProviderMethodArgs {
  userFilter?: Record<string, unknown>;
  nonUserFilter?: unknown;
  extraParams?: Record<string, unknown>;
}

export abstract class ExternalReaderProvider<TOptions = Record<string, unknown>> extends BasePlugin<TOptions> {
  protected registerMethod(name: string, method: ProviderMethod): void;
  getMethod(name: string): ProviderMethod | undefined;
  listMethods(): string[];
}
```

Call `this.registerMethod("methodName", async (args) => {...})` for each method you want to expose — typically from your constructor (after `super(...)`) or from `onInit()`.

## Logging

`context.log` (also reachable as `this.context.log` in a subclass) implements the minimal `PluginLogger` contract:

```ts
export interface PluginLogger {
  save(type: string, data?: unknown, level?: string): unknown;
}
```

Call it as `this.context.log.save("my-plugin|something-happened", { some: "data" }, "error")`. `type` is a free-form string — the convention used by existing plugins is `<namespace>|<event>` (e.g. `send-to-trembita|request-options`, `send-to-trembita|parsed-response|error`). `level` defaults to info-level when omitted; use `"warning"`/`"error"` for problems. The host component logs these as structured JSON alongside its own log stream — there's no separate logger to set up.

## Writing a plugin

1. **Set up the package.** A plugin is a normal npm package with a build step that produces `dist/`. Only publish `dist` (`"files": ["dist"]` in `package.json`).

2. **Declare the manifest.** Add a `liquioPlugin` block to `package.json`:

   ```json
   {
     "name": "@yourscope/your-plugin",
     "main": "dist/index.js",
     "files": ["dist"],
     "liquioPlugin": {
       "kind": "event-external-service",
       "sdkVersion": "^0.1.0"
     },
     "dependencies": {
       "@liquio/plugin-sdk": "^0.1.0"
     }
   }
   ```

   - `kind` must be one of `event-external-service`, `task-payment-provider`, `external-reader-provider`.
   - `sdkVersion` is checked against the host's installed `@liquio/plugin-sdk` version at load time — but **only the major version is compared** (a leading `^`/`~` is stripped before comparing). It's not a full semver range check, so pin loosely and don't rely on it for minor/patch compatibility guarantees.
   - `main` is read from the top-level `package.json` field (not from inside `liquioPlugin`) and defaults to `dist/index.js` if omitted.

3. **Export your class as the module's default export.** The loader does `entry.default ?? entry` on the required module, so:

   ```ts
   // src/index.ts
   import { YourProvider } from "./your_provider";

   export { YourProvider };
   export default YourProvider;
   ```

4. **Implement the base class.** Minimal example (`event-external-service`):

   ```ts
   import { EventExternalServiceProvider, ExternalServiceSendResult, ExternalServiceSendContext } from "@liquio/plugin-sdk";

   interface YourPluginOptions {
     apiUrl: string;
     timeout?: number;
   }

   export class YourProvider extends EventExternalServiceProvider<YourPluginOptions> {
     async send(data: unknown, isTest?: boolean, ctx?: ExternalServiceSendContext): Promise<ExternalServiceSendResult> {
       const { apiUrl } = this.options;
       this.context.log.save("your-plugin|sending", { apiUrl, isTest });

       // ... call the external service ...

       return { request: data, response: {}, isDone: true };
     }
   }
   ```

   `this.options` is typed as `YourPluginOptions` — that's whatever shape you expect the host's `plugins.json` `options` field to have for this plugin instance.

5. **Build and publish.** `tsc` (or your bundler of choice) to `dist/`, then publish to whatever npm registry the host's `plugin-installer` is configured to use.

For a complete real-world reference, see [`@liquio/event-xroad-plugin`](../event-xroad-plugin) — an `event-external-service` plugin with no custom constructor, one `send()` implementation, and structured logging throughout.

## How plugins get loaded (host side)

You generally don't need to touch this as a plugin author, but it's useful to know what's happening:

1. The host component's `plugins.json` lists enabled plugins. `registry` is optional (defaults to the installer's `NPM_REGISTRY` env var):

   ```json
   {
     "registry": "https://registry.npmjs.org",
     "plugins": [
       {
         "package": "@yourscope/your-plugin",
         "version": "1.0.0",
         "isEnabled": true,
         "name": "your-plugin-instance",
         "options": { "apiUrl": "https://example.com" }
       }
     ]
   }
   ```

2. At container startup, an init container running [`@liquio/plugin-installer`](../plugin-installer) `npm install`s every enabled `package@version` into a shared volume (with `--ignore-scripts` by default — set `allowInstallScripts: true` in `plugins.json` if your plugin genuinely needs its install scripts to run). The top-level `registry` field is optional and overrides the installer's default registry (`NPM_REGISTRY` env var, itself defaulting to `https://registry.npmjs.org`) — set it if your plugin is published to a private/internal registry.

3. The host component's own process constructs a `PluginLoader` and calls `.load(pluginsConfig)`. For each enabled entry, it:
   - reads `<pluginsDir>/node_modules/<package>/package.json` and validates the `liquioPlugin` manifest,
   - checks `sdkVersion` major-version compatibility,
   - `require()`s the module at `main` (default `dist/index.js`),
   - constructs your class as `new YourProvider({ log, pluginConfig: entry.options ?? {} }, entry.options ?? {})`,
   - awaits `onInit()`,
   - registers the instance under `entry.name` in a `PluginRegistry`.

   A plugin that fails to load (bad manifest, version mismatch, throwing constructor/`onInit`) is logged (`plugin-load-error`) and skipped — it does not stop other plugins from loading. A `plugin-load-summary` is logged afterward with counts of configured vs. loaded plugins.

4. The host looks up your instance later via `pluginRegistry.get(name)` (or, for `external-reader-provider`, calls `getMethod(name)` on it) wherever it needs to invoke plugin behavior.
