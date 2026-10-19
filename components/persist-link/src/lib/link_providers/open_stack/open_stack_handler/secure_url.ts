// Import.
import { getLog } from '../../../context';

// Constants.
const ERROR_MESSAGE_INSECURE_URL =
  'OpenStack URL must use https (credentials are sent to it). Set "allowInsecure": true in the server config to allow plain http.';

/**
 * Require https for an OpenStack URL that receives credentials or tokens, unless explicitly allowed.
 * @param {string} url URL to check.
 * @param {object} serverConfig OpenStack server config (name, allowInsecure).
 * @param {string} label What the URL is (for logs and errors), e.g. "server" or "publicURL".
 * @throws {Error} When the URL is invalid or not https and `allowInsecure` is not strictly true.
 */
export function assertSecureUrl(url, serverConfig, label) {
  const name = serverConfig?.name;
  let protocol;
  let host;
  try {
    ({ protocol, host } = new URL(url));
  } catch {
    getLog().save('openstack-invalid-url', { name, label });
    throw new Error(`Invalid OpenStack ${label} URL for "${name}".`);
  }
  if (protocol === 'https:') {
    return;
  }
  if (protocol === 'http:' && serverConfig?.allowInsecure === true) {
    getLog().save('openstack-server-insecure-http', {
      name,
      label,
      host,
      message: 'OpenStack credentials/token are sent over plain http (allowInsecure is set); use https outside a trusted network.',
    });
    return;
  }
  getLog().save('openstack-insecure-url-refused', { name, label, host });
  throw new Error(ERROR_MESSAGE_INSECURE_URL);
}
