/**
 * Generate a UUID v4.
 * Uses crypto.randomUUID() when available (secure contexts), otherwise falls
 * back to a crypto.getRandomValues()-based implementation so the app works on
 * non-HTTPS origins (e.g. http://172.18.0.1 in local/test environments).
 *
 * @returns {string} A UUID v4 string
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: RFC 4122 v4 UUID via getRandomValues
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

export default generateUUID;
