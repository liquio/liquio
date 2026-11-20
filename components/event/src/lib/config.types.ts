type ConfigSection = Record<string, any>;

/** Event config: `app` section (run modes). */
export interface EventAppConfig extends ConfigSection {
  enabledReadMessageQueueMode?: boolean | string;
  enabledRunDaemonMode?: boolean | string;
}

/** Event config: `log` section. */
export interface EventLogConfig extends ConfigSection {
  console?: any;
  file?: string[];
  excludeParams?: string[];
  disableDefaultRedaction?: boolean | string;
}

/** Event config: `redis` section. */
export interface EventRedisConfig extends ConfigSection {
  enabled?: boolean | string;
}

/** Event config: `message_queue` section. */
export interface EventMessageQueueConfig extends ConfigSection {
  maxHandlingMessages?: any;
  shutdownDrainTimeoutMs?: number | string;
}

/** Event config: `requester` section. */
export interface EventRequesterConfig extends ConfigSection {
  externalService?: ConfigSection;
  registers?: {
    keysAllowedToDeleteMoreThan100Records?: (number | string)[];
    deleteRecordsQueue?: { concurrent?: number | string; interval?: number | string; [key: string]: any };
    [key: string]: any;
  };
}

/** Event config: `notifier` section. */
export interface EventNotifierConfig extends ConfigSection {
  email?: { templateParams?: { frontUrl?: string; [key: string]: any }; [key: string]: any };
}

/** Event config: `filestorage` section. */
export interface EventFilestorageConfig extends ConfigSection {
  apiHost?: string;
  allowInsecureTls?: boolean | string;
  ca?: any;
}

/** Event config: `http_client` section. */
export interface EventHttpClientConfig extends ConfigSection {
  tls?: any[];
}

/** Event config: `user` section. */
export interface EventUserConfig extends ConfigSection {
  LiquioId?: ConfigSection;
}

/** Event config: whole config object returned by the loader. */
export interface EventConfig {
  app?: EventAppConfig;
  custom?: ConfigSection;
  custom_logs?: ConfigSection;
  db?: ConfigSection;
  delayer?: ConfigSection;
  eval_vm?: ConfigSection;
  external_bpmn?: ConfigSection;
  filestorage?: EventFilestorageConfig;
  http_client?: EventHttpClientConfig;
  log?: EventLogConfig;
  message_queue?: EventMessageQueueConfig;
  notifier?: EventNotifierConfig;
  persist_link?: ConfigSection;
  ping?: ConfigSection;
  plugins?: any;
  redis?: EventRedisConfig;
  requester?: EventRequesterConfig;
  sandbox?: ConfigSection;
  server?: ConfigSection;
  sign?: ConfigSection;
  stopper?: ConfigSection;
  system_notifier?: ConfigSection;
  trembita?: ConfigSection;
  unit?: ConfigSection;
  user?: EventUserConfig;
  versions?: ConfigSection;
  [key: string]: any;
}
