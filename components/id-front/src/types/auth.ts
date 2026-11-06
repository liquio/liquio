/**
 * Payload of `GET /auth` (stored by `reducers/auth` on `GET_AUTH_SUCCESS`). The backend
 * decides the fields; the ones the app reads are typed and everything else stays `unknown`.
 */
export interface AuthResponse {
  provider?: unknown;
  user?: unknown;
  info?: unknown;
  redirect?: string;
  twoFactorAuthNeeded?: boolean;
  [key: string]: unknown;
}
