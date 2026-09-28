import { getConfig } from './configLoader';

let providers = null;

/**
 * Load the list of currently enabled login options from id-api.
 * Falls back to an empty list if the request fails, so the login page
 * still renders (with no auth buttons instead of crashing).
 */
export async function loadAuthProviders() {
  if (providers) {
    return providers;
  }

  try {
    const { BACKEND_URL } = getConfig();
    const base = BACKEND_URL + (BACKEND_URL.charAt(BACKEND_URL.length - 1) !== '/' ? '/' : '');
    const response = await fetch(`${base}auth_providers`, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Failed to load auth providers: ${response.status}`);
    }
    const data = await response.json();
    providers = Array.isArray(data.providers) ? data.providers : [];
  } catch (error) {
    console.error('Failed to load auth providers:', error);
    providers = [];
  }

  return providers;
}

/**
 * Get the cached auth providers list (must call loadAuthProviders first).
 */
export function getAuthProviders() {
  return providers || [];
}
