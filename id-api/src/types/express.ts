import express from 'express';
import { PassportStatic } from 'passport';

import { Config } from '../config';
import { UserAttributes } from '../models/user.model';

export interface Express extends express.Express {
  config: Config;
  passport: PassportStatic & { mapping: any; valid: any; normalization: any };
}

declare global {
  namespace Express {
    interface User extends UserAttributes {
      services: Record<string, any>;
    }
  }
}
