import express from 'express';
import { PassportStatic } from 'passport';

import { FlashFunction } from '../middleware/session';

export interface Request extends express.Request {
  requestId?: string;
  traceId?: string;
  authCode?: string;
  isExistingUser?: boolean;
  prepared?: { user: any };
  traceMeta?: Record<string, any>;
  flash?: FlashFunction;
}

declare module 'express-session' {
  interface SessionData {
    authorizationVersion?: number;
    client_id?: string;
    redirect_uri?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    state?: string;
    scope?: string;
    response_type?: string;
    client_requirements?: string[];
    client_name?: string;
    need_scope_approve?: boolean;
    consent?: { csrfToken: string; clientId: string; redirectUri: string; state?: string; scope: string[] };
    client?: { clientId?: string; client_name?: string; requirements: any[]; redirectUri?: string[] };
    passport?: PassportStatic & { user?: any };
    preparedUser?: any;
    twoFactorCompleted?: { userId: string; factor: 'phone' | 'totp' };
    authInfo?: any;
    user?: any;
    forward?: string;
    flash?: Record<string, any>;
  }
}
