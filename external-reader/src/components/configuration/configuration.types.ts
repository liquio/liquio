export interface Configuration {
  auth: {
    basicAuthTokens: string[];
  };
  server: {
    port: number;
  };
  captcha: {
    hmacKey?: string;
    isEnabled?: boolean;
    isEnabledFor?: string[];
  };
  services: {
    [key: string]: {
      isEnabled: boolean;
      class: string;
      options?: unknown;
    };
  };
}
