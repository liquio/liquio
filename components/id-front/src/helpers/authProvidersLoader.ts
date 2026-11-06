import { getConfig } from './configLoader';

/** A login option as returned by id-api `auth_providers`; the list is not validated per item. */
export interface AuthProvider {
  type?: string;
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
  [key: string]: unknown;
}

let providers: AuthProvider[] | null = null;

/**
 * Load the list of currently enabled login options from id-api.
 * Falls back to an empty list if the request fails, so the login page
 * still renders (with no auth buttons instead of crashing).
 */
export async function loadAuthProviders(): Promise<AuthProvider[]> {
  if (providers) {
    return providers;
  }

  try {
    const BACKEND_URL = getConfig().BACKEND_URL as string; // undefined throws below and is caught
    const base = BACKEND_URL + (BACKEND_URL.charAt(BACKEND_URL.length - 1) !== '/' ? '/' : '');
    const response = await fetch(`${base}auth_providers`, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Failed to load auth providers: ${response.status}`);
    }
    // A body that is null (or not an object) throws here and is handled by the catch below; preserved.
    const data = (await response.json()) as { providers?: unknown };
    providers = Array.isArray(data.providers) ? (data.providers as AuthProvider[]) : [];
  } catch (error) {
    console.error('Failed to load auth providers:', error);
    providers = [];
  }

  return providers;
}

/**
 * Get the cached auth providers list (must call loadAuthProviders first).
 */
export function getAuthProviders(): AuthProvider[] {
  return providers || [];
}
