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
  /** Page console message types to log (log, debug, info, error, warning...). Default: warning, error. */
  consoleLogLevels?: string[];
  /** Max page console messages logged per job. Default: 20. */
  consoleLogMaxMessages?: number;
  /** Run Chromium without its sandbox. Default: false (sandbox on). Set only where user namespaces are unavailable. */
  noSandbox?: boolean;
}

export interface AuthConfig {
  basicAuthTokens: string[];
}
