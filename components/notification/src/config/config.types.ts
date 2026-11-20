/**
 * Notification config: one environment section (e.g. `production`) of the loaded config.
 * Opaque or unread sections are typed as plain records.
 */
export interface NotificationConfig {
  processTitle?: string;
  port?: number | string;
  trustProxy?: number | boolean | string;
  tls?: {
    enabled?: boolean;
    certPath?: string;
    keyPath?: string;
    caPath?: string;
  };
  username?: string;
  password?: string;
  database?: string;
  host?: string;
  dialect?: string;
  defaultMessenger?: string;
  customAdapter?: Record<string, any>;
  db: {
    host?: string;
    port?: number | string;
    database?: string;
    username?: string;
    password?: string;
    dialect?: string;
    logging?: boolean;
    ssl?: any;
    dialectOptions?: Record<string, any>;
  };
  auth_server?: Record<string, any>;
  smsServer?: Record<string, any>;
  adminConfig?: Record<string, any>;
  corezoidConfig?: {
    apiLogin?: string;
    apiKey?: string;
    processId?: string;
  };
  sendSmsByNotifyhubAPI?: boolean;
  smtpServer?: Record<string, any>;
  customer?: string;
  environment?: string;
  testService?: {
    token?: string;
  };
}

/**
 * Notification raw config: the multi-environment object loaded from `config.json`.
 */
export interface NotificationRawConfig {
  default_env?: string;
  [env: string]: unknown;
}
