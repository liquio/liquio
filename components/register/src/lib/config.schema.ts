import crypto from 'node:crypto';

import { z } from 'zod';
import type { SandboxConfig } from '@liquio/back-core';

import type { RegisterConfig } from './config';
import type { TlsConfig } from './tls';

/** Minimum length of the password part of a Basic auth token. */
export const MIN_TOKEN_PASSWORD_LENGTH = 8;

// SHA-256 of the Basic token that shipped in the repository (`register:` + a public password). It is public, so production refuses it.
export const KNOWN_DEFAULT_TOKEN_HASHES: string[] = ['79cfad97612a45f9884d9c6e57da30ea9d0e4554e60e24fe75ef7018880bf23a'];

const PLACEHOLDER_RE = /<?\bREDACTED\b>?|<[^>]*>|changeme|change_me|change-me/i;

/** True when the value is an unmodified template placeholder. */
export const isPlaceholder = (value: string): boolean => PLACEHOLDER_RE.test(value);

const isProduction = (env: string | undefined): boolean => !!env && ['production', 'prod'].includes(env);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// Ports, timeouts and sizes may arrive as numbers or as strings (environment overrides).
const numeric = () => z.custom<number>((v) => typeof v === 'number' || typeof v === 'string', { message: 'must be a number or a string' });
const flag = () => z.custom<boolean>((v) => typeof v === 'boolean' || typeof v === 'string', { message: 'must be a boolean or a string' });
// Accepts anything, the moved rules below report problems with their own messages.
const anything = <T>() => z.custom<T>(() => true);

/**
 * Build the zod schema for the register `RegisterConfig`. Rules that depend on the environment use `env` (default `NODE_ENV`).
 * Messages name settings only, never values.
 */
export function buildRegisterConfigSchema(env: string | undefined = process.env.NODE_ENV): z.ZodType<RegisterConfig> {
  return z
    .looseObject({
      access_log: z.looseObject({ keyIds: anything<string[]>() }),
      admin: z.looseObject({ swagger: flag().optional() }).optional(),
      afterhandler: z.looseObject({
        options: z.looseObject({ reindexLimit: numeric() }),
        blockchain: anything<any>(),
        elastic: anything<any>(),
      }),
      app: z.looseObject({ processTitle: z.string() }),
      auth: z.looseObject({
        tokens: anything<string[]>(),
        allowRawSequelizeParamsUsers: anything<string[]>().optional(),
        trustedCallers: z.array(z.string()).optional(),
        userAllowTokens: z.record(z.string(), z.array(z.string())).optional(),
        limitedAccess: anything<Array<{ user: string; keys: string[] }>>().optional(),
        servicePermissions: anything<RegisterConfig['auth']['servicePermissions']>().optional(),
        strict: anything<boolean>().optional(),
        allowKnownDefaultToken: flag().optional(),
      }),
      db: z.looseObject({
        database: z.string(),
        host: z.string(),
        port: numeric(),
        dialect: z.string(),
        username: z.string(),
        password: z.string(),
        operatorsAliases: flag(),
        dialectOptions: anything<RegisterConfig['db']['dialectOptions']>(),
        pool: anything<RegisterConfig['db']['pool']>(),
        logging: flag(),
        migrationStorageTableName: z.string(),
      }),
      encryption: z.looseObject({
        key: z.string(),
        iv_size: numeric(),
        batch_job_size: numeric(),
        check_on_startup: flag().optional(),
      }),
      filters: z.looseObject({ wrongValues: z.array(z.string()) }),
      key_signature: z.record(z.string(), anything<{ validationIdentity: string[] }>()).optional(),
      log: z.looseObject({
        console: z.array(z.any()),
        responsesData: flag(),
        excludeParams: z.array(z.string()),
        disableDefaultRedaction: flag().optional(),
      }),
      pagination: z.looseObject({
        maxLimit: numeric(),
        maxExportLimit: numeric(),
        maxCsvExportRecords: numeric().optional(),
        packetLimit: numeric(),
      }),
      redis: z
        .looseObject({
          isEnabled: flag().optional(),
          host: z.string().optional(),
          port: numeric().optional(),
          defaultTtl: numeric().optional(),
        })
        .optional(),
      sandbox: z.custom<SandboxConfig>((v) => isObject(v), { message: 'must be an object' }).optional(),
      search: z.record(z.string(), anything<NonNullable<RegisterConfig['search']>[string]>()).optional(),
      server: z.looseObject({
        hostname: z.string(),
        port: numeric(),
        maxBodySize: z.string(),
        maxBulkBodySize: z.string().optional(),
        requestTimeout: numeric().optional(),
        headersTimeout: numeric().optional(),
        customer: z.string(),
        environment: z.string(),
      }),
      sign: z.looseObject({
        timeout: numeric(),
        url: z.string(),
        token: z.string(),
        tls: z.custom<TlsConfig>((v) => isObject(v), { message: 'must be an object' }).optional(),
        allowPlainHttp: flag().optional(),
        allowEmptyToken: flag().optional(),
      }),
    })
    .superRefine((config, ctx) => {
      const add = (path: Array<string | number>, message: string) => ctx.addIssue({ code: 'custom', path, message });
      const auth = config.auth as Record<string, any>;

      const tokens = auth.tokens;
      if (!Array.isArray(tokens) || tokens.length === 0) {
        add(['auth', 'tokens'], 'is empty: at least one Basic auth token must be configured.');
      } else {
        // Production only; `auth.allowKnownDefaultToken: true` opts out.
        const refuseKnownDefault = isProduction(env) && auth.allowKnownDefaultToken !== true;
        tokens.forEach((token: unknown, index: number) => {
          const path = ['auth', 'tokens', index];
          if (typeof token !== 'string' || token.trim() === '') {
            add(path, 'is empty or not a string.');
            return;
          }
          if (isPlaceholder(token)) {
            add(path, 'is a placeholder value.');
            return;
          }
          if (refuseKnownDefault) {
            const normalized = /^Basic\s/i.test(token.trim()) ? `Basic ${token.trim().split(/\s+/)[1]}` : token.trim();
            if (KNOWN_DEFAULT_TOKEN_HASHES.includes(crypto.createHash('sha256').update(normalized).digest('hex'))) {
              add(path, 'is a publicly known default token from the repository, rotate it (or set auth.allowKnownDefaultToken=true).');
              return;
            }
          }
          const match = /^Basic\s+(\S+)$/i.exec(token.trim());
          if (!match) return; // Non-Basic tokens are not inspected.
          const decoded = Buffer.from(match[1], 'base64').toString('utf8');
          const separator = decoded.indexOf(':');
          const password = separator === -1 ? '' : decoded.slice(separator + 1);
          if (isPlaceholder(decoded)) {
            add(path, 'decodes to a placeholder value.');
          } else if (password.length < MIN_TOKEN_PASSWORD_LENGTH) {
            add(path, `password is shorter than ${MIN_TOKEN_PASSWORD_LENGTH} characters.`);
          }
        });
      }

      if (auth.strict !== undefined && typeof auth.strict !== 'boolean') {
        add(['auth', 'strict'], 'must be a boolean.');
      }
      const permissions = auth.servicePermissions;
      if (permissions !== undefined && permissions !== null) {
        if (!isObject(permissions)) {
          add(['auth', 'servicePermissions'], 'must be an object.');
        } else {
          for (const [user, entry] of Object.entries(permissions)) {
            const path = ['auth', 'servicePermissions', user];
            if (!isObject(entry)) {
              add(path, 'must be an object.');
              continue;
            }
            const { routes, keys } = entry;
            if (routes !== undefined && (!Array.isArray(routes) || !routes.every((r) => typeof r === 'string'))) {
              add([...path, 'routes'], 'must be an array of strings.');
            }
            if (keys !== undefined && (!Array.isArray(keys) || !keys.every((k) => typeof k === 'string' || typeof k === 'number'))) {
              add([...path, 'keys'], 'must be an array of key ids.');
            }
          }
        }
      }

      const key = config.encryption.key;
      if (typeof key === 'string' && key !== '' && isPlaceholder(key)) {
        add(['encryption', 'key'], 'is a placeholder value.');
      }
    }) as unknown as z.ZodType<RegisterConfig>;
}

/** Zod schema for the register `RegisterConfig`, built for the current `NODE_ENV`. */
export const registerConfigSchema: z.ZodType<RegisterConfig> = buildRegisterConfigSchema();
