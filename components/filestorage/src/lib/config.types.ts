/**
 * Filestorage configuration, as read by the service code.
 * Sections not listed in detail are loosely typed.
 */
export interface FilestorageConfig {
  admin: Record<string, any>;
  app: {
    processTitle: string;
    cliEnabled?: boolean;
    [key: string]: any;
  };
  auth: {
    tokens?: string[];
    [key: string]: any;
  };
  db: Record<string, any>;
  log: {
    console?: string[];
    excludeParams?: string[];
    disableDefaultRedaction?: boolean;
    [key: string]: any;
  };
  modules_settings?: Record<string, any>;
  pagination?: Record<string, any>;
  preview?: Record<string, any>;
  providers: {
    activeProvider?: string | null;
    list?: Record<string, any>;
    [key: string]: any;
  };
  server: {
    hostname?: string;
    port?: number | string;
    maxBodySize?: string | number;
    maxUploadSize?: number | string;
    customer?: number | string;
    environment?: number | string;
    [key: string]: any;
  };
  versions?: Record<string, any>;
  [key: string]: any;
}
