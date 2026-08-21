import { Express } from 'express';
import cors from 'cors';

import { Config } from '../config';

export function useCors(express: Express & { config: Config }) {
  const config = express.config;

  const allowedOrigins = config.cors?.allowedOrigins || ['*'];
  const maxAge = config.cors?.maxAge || 60 * 60 * 24 * 365;

  express.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      exposedHeaders: ['Name', 'Version', 'Customer', 'Environment', 'X-Trace-Id'],
      maxAge,
    }),
  );
}
