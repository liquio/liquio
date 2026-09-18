import type { AuthUser } from './auth';

export interface AuthUnit {
  id: number;
  name: string;
  head?: boolean;
  member?: boolean;
  menuConfig?: unknown;
  [key: string]: unknown;
}

export interface AuthState {
  token: string | null;
  info: AuthUser | null;
  useTwoFactorAuth: boolean;
  foundUser: AuthUser | null | undefined;
  tokenError: boolean;
  units: AuthUnit[] | null;
  userUnits: AuthUnit[] | null;
  debugMode: boolean;
  settings?: Record<string, unknown>;
  // Existing reducer fields are kept separately from the profile for compatibility.
  firstName?: string;
  lastName?: string;
  middleName?: string;
}

/** Redux also sends initialization and unrelated feature actions to this reducer. */
export interface StoreAction {
  type: string;
  payload?: unknown;
  [key: string]: unknown;
}

export type AuthAction =
  | { type: 'AUTH_SET_TOKEN'; payload: string | null }
  | { type: 'TOKEN_ERROR'; payload: boolean }
  | { type: 'REQUEST_USER_INFO_SUCCESS'; payload: AuthUser | string }
  | { type: 'REQUEST_UNITS_SUCCESS'; payload: AuthUnit[] | null }
  | { type: 'SET_USER_SETTINGS'; payload: Record<string, unknown> | null }
  | {
      type: 'REQUEST_USER_SETTINGS_SUCCESS';
      payload: { data?: Record<string, unknown> | null } | null;
    }
  | { type: 'REQUEST_AUTH_MODE_SUCCESS'; payload: { useTwoFactorAuth: boolean } }
  | { type: 'SEARCH_USER_SUCCESS'; payload: { users: AuthUser[] } }
  | { type: 'UPDATE_USER_INFO' | 'SET_USER_PHONE_VALID_SUCCESS'; payload: AuthUser }
  | {
      type: 'LOGOUT' | 'REQUEST_USER_INFO_FAIL' | 'VERIFY_EMAIL_CODE_SUCCESS' | 'TOGGLE_DEBUG_MODE';
    };
