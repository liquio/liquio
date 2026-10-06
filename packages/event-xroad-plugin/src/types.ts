/**
 * Config for a single X-Road/Trembita service, as it used to live under
 * `global.config.requester.externalService.trembita.serviceList[service]` or
 * `global.config.requester.externalService.trembita.trembitaHeader.service`
 * (see `TrembitaProvider#getTrembitaConfig` in
 * `components/event/src/services/event/requester/external_service/providers/trembita.js`).
 *
 * Only `soapAction` and `serviceCode` are actually read by `XroadProvider#send`
 * (the SOAP action header and the fault-detection branching), but the original
 * shape carries additional X-Road identification fields (client/service
 * identifiers used elsewhere, e.g. in the SOAP body templates), so extra
 * properties are allowed through the index signature.
 */
export interface XroadServiceConfig {
  soapAction: string;
  serviceCode: string;
  [key: string]: unknown;
}

/**
 * Mirrors the old `global.config.requester.externalService.trembita.trembitaHeader`
 * shape. `service` is the default service config used when a given `service`
 * name has no entry in `serviceList`.
 */
export interface XroadTrembitaHeader {
  service: XroadServiceConfig;
  [key: string]: unknown;
}

/**
 * Options for `XroadProvider`.
 *
 * `trembitaUrl`, `timeout` and `debug` map 1:1 onto the old
 * `TrembitaProvider` constructor's `config` argument
 * (`{ trembitaUrl, timeout = 20000, debug = false }`).
 *
 * `trembitaHeader`/`serviceList` replace the old
 * `TrembitaProvider#getTrembitaConfig` global-config lookup
 * (`global.config.requester.externalService.trembita.{trembitaHeader,serviceList}`),
 * which is not available inside a plugin. Since the plugin only ever
 * receives `this.options` (from `plugins.json`) and `send()`'s arguments,
 * this is the equivalent per-plugin-instance config; it's keyed the same way
 * the original was (`serviceList[service]` falling back to
 * `trembitaHeader.service`).
 */
export interface XroadOptions {
  trembitaUrl: string;
  timeout?: number;
  debug?: boolean;
  trembitaHeader: XroadTrembitaHeader;
  serviceList?: Record<string, XroadServiceConfig>;
}
