export interface ServerConfig {
  port: number;
  /** Body limit for authenticated `POST /pdf`. */
  bodyLimit?: string;
  /** Body limit for all other routes. */
  defaultBodyLimit?: string;
}

export interface PlaywrightConfig {
  timeout: number;
  maxWorkers: number;
  maxConcurrentJobs: number;
  maxQueueSize?: number;
  allowedHosts?: string[];
}

export interface AuthConfig {
  basicAuthTokens: string[];
}
