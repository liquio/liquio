declare namespace Express {
  interface Request {
    authAccessToken?: string;
    authUserInfo?: any; // UserInfo — type later
    authUserId?: string;
    authUserRoles?: string[];
    authUserUnitEntities?: { head: any[]; member: any[]; all: any[] };
    authUserUnits?: string[];
    separatedAuthUserUnits?: any;
    requestMeta?: any;
    traceId?: string;
    traceMeta?: Record<string, any>;
    basicAuthUser?: any;
    requestId?: string;
  }
}
