/**
 * Manager configuration, as read by the loader and bootstrap.
 * Unlisted keys of each section are carried through untouched.
 */
export interface ManagerConfig {
  cache: {
    /** Interval of BPMN schemas reload, ms. */
    reloadBpmnSchemasInterval?: number;
    [key: string]: any;
  };
  db: {
    host?: string;
    port?: number | string;
    database?: string;
    username?: string;
    password?: string;
    dialect?: string;
    [key: string]: any;
  };
  log: {
    console: { name?: string; [key: string]: any };
    excludeParams?: string[];
    disableDefaultRedaction?: boolean;
    [key: string]: any;
  };
  message_queue: {
    provider?: string;
    amqpConnection?: string;
    maxHandlingMessages?: number;
    readingQueueName?: string;
    [key: string]: any;
  };
  ping?: Record<string, any>;
  redis?: Record<string, any>;
  server?: Record<string, any>;
  system_notifier?: Record<string, any>;
  versions?: Record<string, any>;
  [key: string]: any;
}
