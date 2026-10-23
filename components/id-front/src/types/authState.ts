import type { AuthResponse } from './auth';

/**
 * `state.auth`. Besides the two flags it holds whatever `GET /auth` returned: the reducer
 * spreads the payload into the state without checking it.
 */
export interface AuthState extends AuthResponse {
  DBError: boolean;
  ERROR_503: boolean;
}

/**
 * Redux also sends initialization actions and the request actions of other features
 * (`*_LOADING`, `*_SUCCESS`, `*_FAIL`) to every reducer, so reducers accept any action
 * and cast `payload` inside the branches they handle.
 */
export interface StoreAction {
  type: string;
  payload?: unknown;
  [key: string]: unknown;
}
