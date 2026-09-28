/** Known shared fields; deployment-specific extensions remain unknown until typed. */
export interface ApplicationConfig {
  name?: string;
  environment?: string;
  type?: string;
  version?: string;
  [key: string]: unknown;
}

export interface ConfigDefaults {
  application?: ApplicationConfig;
  backendUrl?: string;
  authLink?: string;
  idAuthLink?: string;
  clientId?: string;
  defaultLanguage?: string;
  defaultRoute?: string;
  adminPanelUrl?: string;
  cabinetUrl?: string;
  storageType?: 'local' | 'session';
  disableCabinetState?: boolean;
  showPhone?: boolean;
  sessionLifeTime?: number;
  [key: string]: unknown;
}

export interface RuntimeConfig extends ConfigDefaults {
  application: ApplicationConfig;
}
