export interface ServerConfig {
  port: number;
  bodyLimit?: string;
}

export interface PlaywrightConfig {
  timeout: number;
  maxWorkers: number;
  maxConcurrentJobs: number;
}

export interface AuthConfig {
  basicAuthTokens: string[];
}
