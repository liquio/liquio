import { INestApplication } from '@nestjs/common';
import * as bodyParser from 'body-parser';

// Large enough for base64 encoded signed documents, small enough to bound per-request memory.
export const DEFAULT_ACCEPTED_BODY_SIZE = '10mb';

export function applyBodyLimit(app: INestApplication, acceptedBodySize?: string): string {
  const limit = acceptedBodySize || DEFAULT_ACCEPTED_BODY_SIZE;
  app.use(bodyParser.json({ limit }));
  app.use(bodyParser.urlencoded({ limit, extended: true }));
  return limit;
}
