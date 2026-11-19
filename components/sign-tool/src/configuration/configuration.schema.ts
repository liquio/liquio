import { z } from 'zod';

import type { Configuration } from './configuration.service';

export const configurationSchema: z.ZodType<Configuration> = z.looseObject({
  x509: z
    .looseObject({
      caCerts: z.array(z.string()).optional(),
    })
    .optional(),
  server: z.looseObject({
    host: z.string().optional(),
    port: z.union([z.number(), z.string()]).optional(),
    isSwaggerEnabled: z.boolean().optional(),
    acceptedBodySize: z.string().optional(),
    tls: z
      .looseObject({
        enabled: z.boolean().optional(),
        certPath: z.string().optional(),
        keyPath: z.string().optional(),
        caPath: z.string().optional(),
      })
      .optional(),
  }),
});
