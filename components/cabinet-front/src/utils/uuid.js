/**
 * Generate a UUID v4 using the native Crypto API
 * Available in all modern browsers
 * 
 * @returns {string} A UUID v4 string
 */
export function generateUUID() {
  return crypto.randomUUID();
}

export default generateUUID;
