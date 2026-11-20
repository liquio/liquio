import crypto from 'node:crypto';

import { z } from 'zod';

import type { TaskConfig } from './config.types';
import {
  KNOWN_DEFAULT_BASIC_TOKEN_HASHES,
  MIN_TEST_USER_TOKEN_LENGTH,
  PLACEHOLDER_SECRETS,
  TEST_AUTH_FLAGS,
  TEST_AUTH_PRODUCTION_OVERRIDE_ENV,
  checkDownloadTokenSecret,
} from './config_validation';

const PRODUCTION_ENV = 'production';

const numberOrString = z.union([z.number(), z.string()]);
const section = z.looseObject({}).optional();

/**
 * Check one Basic token.
 * @param {any} token Token from config.
 * @returns {string|null} Problem description or null.
 */
function checkBasicToken(token: any): string | null {
  if (typeof token !== 'string') {
    return 'is not a string';
  }

  const normalizedToken = token.startsWith('Basic ') ? token : `Basic ${token}`;
  const hash = crypto.createHash('sha256').update(normalizedToken).digest('hex');
  if (KNOWN_DEFAULT_BASIC_TOKEN_HASHES.includes(hash)) {
    return 'is a publicly known default token from the repository, rotate it';
  }

  const credentials = Buffer.from(normalizedToken.slice('Basic '.length), 'base64').toString('utf8').split(':');
  if (credentials.length !== 2 || !credentials[0] || !credentials[1]) {
    return 'does not contain non-empty "user:password"';
  }
  if (credentials[0] === credentials[1]) {
    return 'has the password equal to the user name';
  }

  return null;
}

/**
 * Build the task config schema. It validates only: the loaded object is returned as is.
 * @param {string} [env] Node environment.
 * @param {string} [override] Value of ALLOW_TEST_AUTH_IN_PRODUCTION.
 * @returns {z.ZodType<TaskConfig>} Config schema.
 */
export function buildTaskConfigSchema(
  env: string | undefined = process.env.NODE_ENV,
  override: string | undefined = process.env[TEST_AUTH_PRODUCTION_OVERRIDE_ENV],
): z.ZodType<TaskConfig> {
  const isProduction = env === PRODUCTION_ENV;

  const schema: z.ZodType<TaskConfig> = z
    .looseObject({
      basic_auth: z.looseObject({ tokens: z.custom<string[]>(() => true) }),
      download_token: z.looseObject({ jwtSecret: z.string().nullish(), lifetimeInSeconds: numberOrString.nullish() }).optional(),
      auth: z
        .looseObject({
          allowedTestAuth: z.boolean().optional(),
          allowedTestSign: z.boolean().optional(),
          allowedTestPem: z.boolean().optional(),
        })
        .optional(),
      test_users: z.looseObject({ list: z.array(z.looseObject({ token: z.string().nullish() })).optional() }).optional(),
      log: z.looseObject({ console: z.custom<any>((value) => typeof value === 'object' && value !== null) }),
      server: z.looseObject({
        hostname: z.string().optional(),
        port: numberOrString.optional(),
        maxBodySize: numberOrString.optional(),
        trustProxy: z.union([z.boolean(), z.number(), z.string()]).optional(),
        serverName: z.string().optional(),
        customer: z.string().optional(),
        environment: z.string().optional(),
      }),
      db: z.looseObject({
        host: z.string().optional(),
        port: numberOrString.optional(),
        database: z.string().optional(),
        username: z.string().optional(),
        password: z.string().optional(),
        dialect: z.string().optional(),
      }),
      access: section,
      admin: section,
      cache: section,
      custom_logs: section,
      documents: section,
      eds: section,
      external_reader: section,
      file_generator: section,
      filestorage: section,
      mapping: section,
      message_queue: section,
      model: section,
      modules: section,
      notifier: section,
      onboarding: section,
      pdf_generator: section,
      persist_link: section,
      ping: section,
      plugins: z.any().optional(),
      redis: section,
      register: section,
      sign: section,
      storage: section,
      system_notifier: section,
      system_task: section,
      task_finish: section,
      user: section,
      versions: section,
      sandbox: section,
      http_client: section,
    })
    .superRefine((config: Record<string, any>, ctx) => {
      // basic_auth: no publicly known default token, and a token list in production.
      const tokens = config.basic_auth?.tokens;
      if (!Array.isArray(tokens)) {
        ctx.addIssue({ code: 'custom', path: ['basic_auth', 'tokens'], message: 'must be an array' });
      } else if (!tokens.length) {
        if (isProduction) {
          ctx.addIssue({
            code: 'custom',
            path: ['basic_auth', 'tokens'],
            message: 'is empty: provide basic_auth.json (or SECRET_PATH / env config) with environment-specific tokens',
          });
        }
      } else {
        tokens.forEach((token, index) => {
          const problem = checkBasicToken(token);
          if (problem) {
            ctx.addIssue({ code: 'custom', path: ['basic_auth', 'tokens', index], message: problem });
          }
        });
      }

      // download_token: a usable signing secret.
      const secretProblem = checkDownloadTokenSecret(config.download_token?.jwtSecret);
      if (secretProblem) {
        ctx.addIssue({
          code: 'custom',
          path: ['download_token', 'jwtSecret'],
          message: secretProblem.replace(/^download_token\.jwtSecret /, ''),
        });
      }

      // test auth: the test_users bypass.
      const list = config.test_users?.list;
      const users: any[] = Array.isArray(list) ? list : [];
      const enabled = TEST_AUTH_FLAGS.filter((flag) => config.auth?.[flag] === true && (flag !== 'allowedTestPem' || users.length > 0));
      if (!enabled.length) {
        return;
      }

      if (isProduction && override !== 'true') {
        ctx.addIssue({
          code: 'custom',
          path: ['auth'],
          message:
            `auth.${enabled.join(', auth.')} enabled in production: test_users tokens would bypass authentication. ` +
            `Disable it, or set ${TEST_AUTH_PRODUCTION_OVERRIDE_ENV}=true to override explicitly`,
        });
      }

      users.forEach((user, index) => {
        const token = user?.token;
        const path = ['test_users', 'list', index, 'token'];
        if (typeof token !== 'string' || token.trim().length < MIN_TEST_USER_TOKEN_LENGTH) {
          ctx.addIssue({ code: 'custom', path, message: `is missing or shorter than ${MIN_TEST_USER_TOKEN_LENGTH} characters` });
        } else if (/^<.*>$/.test(token.trim().toLowerCase()) || PLACEHOLDER_SECRETS.includes(token.trim().toLowerCase())) {
          ctx.addIssue({ code: 'custom', path, message: 'is a placeholder' });
        }
      });
    });

  return schema;
}
