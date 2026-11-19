import crypto from 'node:crypto';

import { z } from 'zod';

import { FilestorageConfig } from './config.types';

// SHA-256 hashes of tokens that were committed to config-templates/filestorage/auth.json.
// They are public, so they must never be accepted, whatever config the service is started with.
export const COMPROMISED_TOKEN_HASHES: string[] = [
  '55f73f4e50eb6ed8e1538dc7fd3298327c648104d1afc1e29f1a6e662fb5277d',
  '4836cc9400320806e418b862701b65df74651c3f2c8a2e089011012e3dce2b23',
  // CE-only: "Basic dGVzdDE6dGVzdA==" (test1:test), shipped in config-templates and the swagger example.
  '351edb1f834c66257939baa1530fad4c4aa4a4109d753b1e068c10c373343568',
];

/**
 * Check one auth token.
 * @param {any} token Token from config.
 * @returns {string|null} Problem description or null.
 */
function checkToken(token: any): string | null {
  if (typeof token !== 'string') {
    return 'is not a string';
  }

  const [keyword, base64Part, ...rest] = token.split(' ');
  if (keyword !== 'Basic' || !base64Part || rest.length) {
    return 'is not in "Basic <base64(user:password)>" format';
  }

  const credentials = Buffer.from(base64Part, 'base64').toString('utf8').split(':');
  if (credentials.length !== 2 || !credentials[0] || !credentials[1]) {
    return 'does not contain non-empty "user:password"';
  }

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  if (COMPROMISED_TOKEN_HASHES.includes(hash)) {
    return 'is a publicly known token from the repository, rotate it';
  }

  return null;
}

const section = () => z.looseObject({});

/**
 * Filestorage config schema. Validates only, the loaded object is returned as is.
 * The service must not start without real auth tokens.
 */
export const filestorageConfigSchema: z.ZodType<FilestorageConfig> = z.looseObject({
  admin: section(),
  app: z.looseObject({
    processTitle: z.string(),
    cliEnabled: z.boolean().optional(),
  }),
  auth: z
    .looseObject({
      tokens: z.any().optional(),
    })
    .superRefine((auth, ctx) => {
      const tokens = auth.tokens;

      if (!Array.isArray(tokens) || !tokens.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['tokens'],
          message: 'is empty: provide auth.json (or LIQUIO_CFG_FILESTORAGE_auth env / SECRET_PATH) with environment-specific tokens',
        });
        return;
      }

      tokens.forEach((token, index) => {
        const problem = checkToken(token);
        if (problem) {
          ctx.addIssue({ code: 'custom', path: ['tokens', index], message: problem });
        }
      });
    }),
  db: section(),
  log: z.looseObject({
    console: z.array(z.string()).optional(),
    excludeParams: z.array(z.string()).optional(),
    disableDefaultRedaction: z.boolean().optional(),
  }),
  modules_settings: section().optional(),
  pagination: section().optional(),
  preview: section().optional(),
  providers: z.looseObject({
    activeProvider: z.string().nullish(),
    list: section().optional(),
  }),
  server: z.looseObject({
    hostname: z.string().optional(),
    port: z.union([z.number(), z.string()]).optional(),
    maxBodySize: z.union([z.number(), z.string()]).optional(),
    maxUploadSize: z.union([z.number(), z.string()]).optional(),
    customer: z.union([z.number(), z.string()]).optional(),
    environment: z.union([z.number(), z.string()]).optional(),
  }),
  versions: section().optional(),
});
