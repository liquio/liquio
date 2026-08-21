import { Strategy as PassportStrategy } from 'passport-strategy';

import { CallbackFn } from './callback_fn';
import { Request } from './request';

export type StrategyVerify = (req: Request, params: Record<string, any>, callback?: CallbackFn) => void | Promise<Record<string, any>>;

export class Strategy extends PassportStrategy {
  authenticateAsync(req: Request, options?: any): Promise<void> | void {
    this.authenticate(req, options);
  }
}
