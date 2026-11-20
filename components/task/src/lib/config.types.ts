/**
 * Task service config: the sections the code reads, loosely typed where the shape is not relied upon.
 */
export interface TaskConfig {
  [key: string]: any;

  /** Basic auth tokens and protected routes. */
  basic_auth: {
    tokens: string[];
    [key: string]: any;
  };

  /** Download token signing options. */
  download_token?: {
    jwtSecret?: string;
    lifetimeInSeconds?: number | string;
    [key: string]: any;
  };

  /** Authentication options. */
  auth?: {
    allowedTestAuth?: boolean;
    allowedTestSign?: boolean;
    allowedTestPem?: boolean;
    [key: string]: any;
  };

  /** Test users, active only with the allowedTest* flags. */
  test_users?: {
    list?: Array<{ token?: string; [key: string]: any }>;
    [key: string]: any;
  };

  /** Logging options. */
  log: {
    console: any;
    [key: string]: any;
  };

  /** HTTP server options. */
  server: {
    hostname?: string;
    port?: number | string;
    maxBodySize?: string | number;
    trustProxy?: boolean | number | string;
    serverName?: string;
    customer?: string;
    environment?: string;
    [key: string]: any;
  };

  /** Database connection options. */
  db: {
    host?: string;
    port?: number | string;
    database?: string;
    username?: string;
    password?: string;
    dialect?: string;
    [key: string]: any;
  };

  access?: Record<string, any>;
  admin?: Record<string, any>;
  cache?: Record<string, any>;
  custom_logs?: Record<string, any>;
  documents?: Record<string, any>;
  eds?: Record<string, any>;
  external_reader?: Record<string, any>;
  file_generator?: Record<string, any>;
  filestorage?: Record<string, any>;
  mapping?: Record<string, any>;
  message_queue?: Record<string, any>;
  model?: Record<string, any>;
  modules?: Record<string, any>;
  notifier?: Record<string, any>;
  onboarding?: Record<string, any>;
  pdf_generator?: Record<string, any>;
  persist_link?: Record<string, any>;
  ping?: Record<string, any>;
  plugins?: any;
  redis?: Record<string, any>;
  register?: Record<string, any>;
  sign?: Record<string, any>;
  storage?: Record<string, any>;
  system_notifier?: Record<string, any>;
  system_task?: Record<string, any>;
  task_finish?: Record<string, any>;
  user?: Record<string, any>;
  versions?: Record<string, any>;
  sandbox?: Record<string, any>;
  http_client?: Record<string, any>;
}
