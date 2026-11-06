import bodyParser from 'body-parser';
import compression from 'compression';
import { NextFunction, Request, RequestHandler, Response } from 'express';

import { Express } from '../types';

export function useBodyParser(express: Express) {
  express.use(compression());
  express.use(withEmptyBodyDefault(bodyParser.urlencoded({ extended: false })));
  express.use(withEmptyBodyDefault(bodyParser.json({ limit: '50mb' })));
  express.use(withEmptyBodyDefault(bodyParser.raw({ limit: '50mb' })));
  express.use(withEmptyBodyDefault(bodyParser.text({ limit: '50mb' })));
}

/**
 * Keep body-parser 1.x behavior: body-parser 2.x leaves `req.body` undefined when nothing was parsed,
 * while route handlers, validators and passport strategies read it as an object.
 */
export function withEmptyBodyDefault(parser: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    parser(req, res, (error?: unknown) => {
      if (req.body === undefined) {
        req.body = {};
      }
      next(error);
    });
  };
}
