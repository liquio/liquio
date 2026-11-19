export interface GatewayLogConfig {
  console: { name: string; [key: string]: any };
  excludeParams?: any;
  disableDefaultRedaction?: boolean;
  [key: string]: any;
}

export interface GatewayRedisConfig {
  isEnabled?: boolean;
  host: string;
  port: number;
  amqpMessageCache?: Record<string, any>;
  [key: string]: any;
}

export interface GatewayMessageQueueConfig {
  maxHandlingMessages?: number;
  dedup?: Record<string, any>;
  [key: string]: any;
}

export interface GatewayConfig {
  db: Record<string, any>;
  eval_vm?: Record<string, any>;
  log: GatewayLogConfig;
  message_queue: GatewayMessageQueueConfig;
  ping?: Record<string, any>;
  redis?: GatewayRedisConfig;
  sandbox?: Record<string, any>;
  server?: Record<string, any>;
  system_notifier?: Record<string, any>;
  versions?: Record<string, any>;
}
