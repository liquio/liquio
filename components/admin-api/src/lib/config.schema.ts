import crypto from 'node:crypto';

import { z } from 'zod';

import type { AdminApiConfig } from './config.types';
import { CHECKED_SECRET_PATHS, DEV_ENVIRONMENT, KNOWN_DEFAULT_TASK_TOKEN_HASHES, PLACEHOLDER, SLAVE_DB_SECRET_PATHS } from './config_check';

// Numbers and booleans may arrive as strings (environment overrides).
const numeric = () => z.custom<number | string>((v) => typeof v === 'number' || typeof v === 'string', { message: 'must be a number or a string' });
const numericAsNumber = () => z.custom<number>((v) => typeof v === 'number' || typeof v === 'string', { message: 'must be a number or a string' });
const flag = () => z.custom<boolean>((v) => typeof v === 'boolean' || typeof v === 'string', { message: 'must be a boolean or a string' });
const objectLike = () => z.custom<Record<string, any>>((v) => typeof v === 'object' && v !== null, { message: 'must be an object' });
// Secrets are checked by the rules below, not by type: a missing value is allowed in the `dev` environment.
const secret = () => z.custom<string>(() => true).optional();

const section = z.looseObject({}).optional();

const getByPath = (config: Record<string, any>, path: string): any =>
  path.split('.').reduce((acc, key) => (acc === null || acc === undefined ? undefined : acc[key]), config);

const isMissingSecret = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && (value.trim() === '' || value.trim() === PLACEHOLDER));

/**
 * Admin-api config schema. It validates only: the loaded object is returned as is.
 * Required sections are the ones the entrypoint and bootstrap dereference without a guard.
 */
export const adminApiConfigSchema: z.ZodType<AdminApiConfig> = z
  .looseObject({
    auth: z.looseObject({ jwtSecret: secret(), basicAuthToken: secret(), clientSecret: secret() }),
    db: z.looseObject({
      host: z.string().optional(),
      port: numeric().optional(),
      database: z.string().optional(),
      username: z.string().optional(),
      password: secret(),
      dialect: z.string().optional(),
      slave: z.looseObject({ password: secret() }).nullish() as unknown as z.ZodType<AdminApiConfig['db']['slave']>,
    }),
    elastic: section,
    filestorage: section,
    http_client: section,
    internal_transport: section,
    log: z.looseObject({
      console: objectLike(),
      excludeParams: z.array(z.string()).optional(),
      disableDefaultRedaction: flag().optional(),
    }),
    message_queue: z.looseObject({}),
    notifier: z.looseObject({ password: secret() }).optional(),
    proxy: section,
    redis: z
      .looseObject({
        isEnabled: flag().optional(),
        host: z.string().optional(),
        port: numericAsNumber().optional(),
      })
      .optional(),
    register: z
      .looseObject({
        server: z.string().optional(),
        port: numericAsNumber().optional(),
        token: z.string().optional(),
        timeout: numericAsNumber().optional(),
      })
      .optional(),
    sandbox: section,
    server: z.looseObject({
      token: secret(),
      environment: z.string().optional(),
      crypto: z.looseObject({ password: secret(), iv: secret() }).optional(),
    }),
    sign: z.looseObject({ token: secret() }).optional(),
    task: z.looseObject({ token: secret() }).optional(),
    user: section,
    workflow_editor: section,
    workflow_history: section,
  })
  .superRefine((config, ctx) => {
    const isDev = config.server?.environment === DEV_ENVIRONMENT;

    if (config.server?.token === '') {
      ctx.addIssue({ code: 'custom', path: ['server', 'token'], message: 'must not be empty' });
    }

    if (!isDev) {
      const paths = config.db?.slave ? [...CHECKED_SECRET_PATHS, ...SLAVE_DB_SECRET_PATHS] : CHECKED_SECRET_PATHS;
      for (const path of paths) {
        if (isMissingSecret(getByPath(config, path))) {
          ctx.addIssue({
            code: 'custom',
            path: path.split('.'),
            message: `must be set (not empty or "${PLACEHOLDER}") outside of "${DEV_ENVIRONMENT}" environment`,
          });
        }
      }
    }

    const token = config.task?.token;
    if (typeof token !== 'string' || token.trim() === '') {
      if (!isDev) {
        ctx.addIssue({ code: 'custom', path: ['task', 'token'], message: `must be set outside of "${DEV_ENVIRONMENT}" environment` });
      }
      return;
    }
    const trimmed = token.trim();
    const normalized = trimmed.startsWith('Basic ') ? trimmed : `Basic ${trimmed}`;
    const hash = crypto.createHash('sha256').update(normalized).digest('hex');
    if (KNOWN_DEFAULT_TASK_TOKEN_HASHES.includes(hash)) {
      ctx.addIssue({ code: 'custom', path: ['task', 'token'], message: 'is a publicly known default token from the repository, rotate it.' });
    }
  });
