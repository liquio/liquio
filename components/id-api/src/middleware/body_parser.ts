import bodyParser from 'body-parser';
import compression from 'compression';

import { Express } from '../types';

export function useBodyParser(express: Express) {
  express.use(compression());
  express.use(bodyParser.urlencoded({ extended: false }));
  express.use(bodyParser.json({ limit: '50mb' }));
  express.use(bodyParser.raw({ limit: '50mb' }));
  express.use(bodyParser.text({ limit: '50mb' }));
}
