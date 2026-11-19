import { PluginsConfig } from '@liquio/plugin-sdk';

export interface ExternalReaderConfig {
  auth?: {
    basicAuthTokens?: string[];
  };
  server: {
    port: number | string;
    isSwaggerEnabled?: boolean;
  };
  captcha?: {
    hmacKey?: string;
    isEnabled?: boolean;
    isEnabledFor?: string[];
  };
  services?: {
    [key: string]: {
      isEnabled: boolean;
      class: string;
      options?: unknown;
    };
  };
  plugins?: PluginsConfig;
}
