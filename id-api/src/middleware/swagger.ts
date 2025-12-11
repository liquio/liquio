import swaggerUi from 'swagger-ui-express';

import swaggerDocument from '../../swagger.json';
import { Express } from '../types';

export function useSwagger(express: Express) {
  if (express.config.swagger) {
    express.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  }
}
