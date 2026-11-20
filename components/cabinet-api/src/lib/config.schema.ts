import { z } from 'zod';

import type { CabinetApiConfig, CabinetApiLogConfig } from './config.types';

const numOrStr = z.union([z.number(), z.string()]);

const liquioIdSchema = z.looseObject({
  server: z.string().optional(),
  port: numOrStr.optional(),
  routes: z.record(z.string(), z.string()).optional(),
  timeout: numOrStr.optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  basicAuthToken: z.string().optional(),
});

const authSchema = z.looseObject({
  LiquioId: liquioIdSchema,
  authRedirectUrl: z.string().optional(),
  logoutRedirectUrl: z.string().optional(),
  jwtSecret: z.string().optional(),
  ttlSeconds: numOrStr.optional(),
  jwtOnlyFreshnessSeconds: numOrStr.optional(),
  allowedTestAuth: z.boolean().optional(),
  allowedTestSign: z.boolean().optional(),
  allowedTestPem: z.boolean().optional(),
  defaultUnits: z.array(z.any()).optional(),
  doNotLogoutOtherSessions: z.boolean().optional(),
  caching: z
    .looseObject({
      isEnabled: z.boolean().optional(),
      getCheckMiddleware: z
        .looseObject({
          isEnabled: z.boolean().optional(),
          ttl: numOrStr.optional(),
        })
        .optional(),
    })
    .optional(),
});

// The template ships `console` as an empty array, the code reads it as an object: both shapes are valid.
const logSchema = z.looseObject({
  console: z.custom<CabinetApiLogConfig['console']>((v) => typeof v === 'object' && v !== null),
  file: z.unknown().optional(),
  excludeParams: z.array(z.string()).optional(),
  disableDefaultRedaction: z.boolean().optional(),
});

const serverSchema = z.looseObject({
  hostname: z.string().optional(),
  port: numOrStr.optional(),
  maxBodySize: numOrStr.optional(),
  swagger: z.boolean().optional(),
  customer: z.string().optional(),
  environment: z.string().optional(),
});

const customApiSchema = z.looseObject({
  apiName: z.string().optional(),
  proxyTo: z.string().optional(),
  authHeader: z.string().optional(),
  sendUserData: z.boolean().optional(),
  isCheckJwtOnly: z.boolean().optional(),
  headers: z.record(z.string(), z.any()).optional(),
  allowedUnits: z.array(z.any()).optional(),
  allowedPaths: z.array(z.any()).optional(),
});

const discoverySchema = z.looseObject({
  mainProxy: z.string().optional(),
  mainProxyDenyPaths: z.array(z.any()).optional(),
  mainProxyAllowPaths: z.array(z.any()).optional(),
  customApis: z.array(customApiSchema).optional(),
});

const redisSchema = z.looseObject({
  isEnabled: z.boolean().optional(),
  host: z.string().optional(),
  port: numOrStr.optional(),
  defaultTtl: numOrStr.optional(),
});

/** Cabinet-api config schema: checks only what startup needs, unknown keys are kept. */
export const cabinetApiConfigSchema: z.ZodType<CabinetApiConfig> = z.looseObject({
  auth: authSchema,
  db: z.record(z.string(), z.any()),
  discovery: discoverySchema,
  log: logSchema,
  redis: redisSchema.optional(),
  server: serverSchema,
});
