/**
 * Admin-api configuration, as read by the loader, config checks and bootstrap.
 * Unlisted keys of each section are carried through untouched.
 */
export interface AdminApiConfig {
  auth?: {
    jwtSecret?: string;
    basicAuthToken?: string;
    clientSecret?: string;
    [key: string]: any;
  };
  db: {
    host?: string;
    port?: number | string;
    database?: string;
    username?: string;
    password?: string;
    dialect?: string;
    slave?: {
      password?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  elastic?: Record<string, any>;
  filestorage?: Record<string, any>;
  http_client?: Record<string, any>;
  internal_transport?: Record<string, any>;
  log: {
    console: { name?: string; [key: string]: any };
    excludeParams?: string[];
    disableDefaultRedaction?: boolean;
    [key: string]: any;
  };
  message_queue?: Record<string, any>;
  notifier?: {
    password?: string;
    [key: string]: any;
  };
  proxy?: Record<string, any>;
  redis?: {
    isEnabled?: boolean;
    host?: string;
    port?: number;
    [key: string]: any;
  };
  register?: {
    server?: string;
    port?: number;
    token?: string;
    timeout?: number;
    [key: string]: any;
  };
  sandbox?: Record<string, any>;
  server: {
    token?: string;
    environment?: string;
    crypto?: {
      password?: string;
      iv?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  sign?: {
    token?: string;
    [key: string]: any;
  };
  task?: {
    token?: string;
    [key: string]: any;
  };
  user?: Record<string, any>;
  workflow_editor?: Record<string, any>;
  workflow_history?: Record<string, any>;
  [key: string]: any;
}
