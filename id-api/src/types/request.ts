import { Client as OAuthClient } from '@node-oauth/oauth2-server';
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
    client_id?: string;
    client_secret?: string;
    redirect_uri?: string;
    state?: string;
    scope?: string;
    response_type?: string;
    client_requirements?: string[];
    client_name?: string;
    need_scope_approve?: boolean;
    client?: OAuthClient & { clientId?: string; client_name?: string };
    passport?: PassportStatic & { user?: any };
    preparedUser?: any;
    authInfo?: any;
    user?: any;
    forward?: string;
    flash?: Record<string, any>;
  }
}
