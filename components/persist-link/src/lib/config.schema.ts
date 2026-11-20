import { z } from 'zod';

import type { PersistLinkConfig } from './config.types';

// Ports, timeouts and sizes may arrive as numbers or as strings (environment overrides).
const numeric = () => z.custom<number | string>((v) => typeof v === 'number' || typeof v === 'string', { message: 'must be a number or a string' });
const anything = <T>() => z.custom<T>(() => true);

/**
 * Persist-link config schema. Validates only, the loaded object is returned as is.
 * Only `db` and `server` are required, the startup path cannot work without them.
 */
export const persistLinkConfigSchema: z.ZodType<PersistLinkConfig> = z.looseObject({
  auth: z
    .looseObject({
      tokens: anything<string[]>().optional(),
      defaultUnits: anything<Array<number | string>>().optional(),
    })
    .optional(),
  db: z.looseObject({}),
  file_converter: z
    .looseObject({
      isEnabled: z.boolean().optional(),
      url: z.string().optional(),
      token: z.string().optional(),
      timeout: numeric().optional(),
      routes: anything<Record<string, string>>().optional(),
    })
    .optional(),
  link_generator: z
    .looseObject({
      secretKey: z.string().optional(),
      cryptIv: z.string().optional(),
      linksPrefix: z.string().optional(),
      smallHashRandomBytesLength: numeric().optional(),
    })
    .optional(),
  link_providers: z
    .looseObject({
      simple: anything<Record<string, unknown>>().optional(),
      filestorage: z
        .looseObject({
          serversList: anything<unknown[]>().optional(),
          addContentDispositionHeader: z.boolean().optional(),
          inlineContentTypes: anything<string[]>().optional(),
        })
        .optional(),
      external: anything<Record<string, unknown>>().optional(),
    })
    .optional(),
  log: z
    .looseObject({
      console: anything<{ name?: string } | unknown[]>().optional(),
      file: anything<unknown[]>().optional(),
      responsesData: z.boolean().optional(),
      stackTrace: z.boolean().optional(),
      excludeParams: anything<string[]>().optional(),
      disableDefaultRedaction: z.boolean().optional(),
    })
    .optional(),
  pdf_generator: z
    .looseObject({
      url: z.string().optional(),
      basicAuthToken: z.string().optional(),
      requestTimeout: numeric().optional(),
    })
    .optional(),
  sandbox: anything<PersistLinkConfig['sandbox']>().optional(),
  server: z.looseObject({
    hostname: z.string().optional(),
    port: numeric().optional(),
    maxBodySize: numeric().optional(),
  }),
  versions: z
    .looseObject({
      customer: numeric().optional(),
      environment: numeric().optional(),
    })
    .optional(),
});
