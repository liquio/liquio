/**
 * PaginationParams — parameters for Model.paginate()
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

/**
 * PaginatedResult<T> — paginate return type
 */
export interface PaginatedResult<T> {
  rows: T[];
  count: number;
  limit?: number;
  offset?: number;
  page?: number;
}

/**
 * UnitEntityData — constructor params for UnitEntity
 */
export interface UnitEntityData {
  [key: string]: any;
}

/**
 * RequestOptions — for HttpRequest.send()
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  form?: Record<string, any>;
  json?: boolean;
  timeout?: number;
  [key: string]: any;
}

/**
 * TokenPayload — JWT payload shape
 */
export interface TokenPayload {
  userId?: string;
  userInfo?: any;
  roles?: string[];
  [key: string]: any;
}

/**
 * UserInfo — user information from auth service
 */
export interface UserInfo {
  id: string;
  email?: string;
  fullName?: string;
  roles?: string[];
  [key: string]: any;
}
