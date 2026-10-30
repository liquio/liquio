/**
 * Helpers to keep personal data (phones, emails, message bodies) out of logs.
 */

/**
 * Mask phone: keep only last 2 digits.
 * @param {any} phone Phone.
 * @returns {string} Masked phone.
 */
export function maskPhone(phone: any): string {
  const value = typeof phone === 'string' ? phone : phone == null ? '' : String(phone);
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  return `***${digits.slice(-2)}`;
}

/**
 * Mask phones list.
 * @param {any} phones Phones list or single phone.
 * @returns {string[]} Masked phones.
 */
export function maskPhones(phones: any): string[] {
  return (Array.isArray(phones) ? phones : [phones]).map(maskPhone);
}

/**
 * Mask email: keep first char of local part and domain.
 * @param {any} email Email.
 * @returns {string} Masked email.
 */
export function maskEmail(email: any): string {
  const value = typeof email === 'string' ? email : email == null ? '' : String(email);
  if (!value) return '';
  const at = value.lastIndexOf('@');
  if (at < 1) return '***';
  return `${value[0]}***${value.slice(at)}`;
}

/**
 * Mask emails list or comma separated string.
 * @param {any} emails Emails.
 * @returns {string[]} Masked emails.
 */
export function maskEmails(emails: any): string[] {
  const list = Array.isArray(emails) ? emails : typeof emails === 'string' ? emails.split(',') : [emails];
  return list.map((v: any) => maskEmail(typeof v === 'string' ? v.trim() : v));
}

/**
 * Redact message: length only.
 * @param {any} message Message text.
 * @returns {string} Placeholder.
 */
export function redactMessage(message: any): string {
  const length = typeof message === 'string' ? message.length : 0;
  return `[redacted:${length}]`;
}

/**
 * Strip credentials, query string and fragment from a URL.
 * @param {any} url URL (absolute or relative).
 * @returns {string} Safe URL, or empty string.
 */
export function redactUrl(url: any): string {
  if (typeof url !== 'string' || !url) return '';
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url.replace(/^((?:[a-z][a-z0-9+.-]*:)?\/\/)[^/@?#]*@/i, '$1').split(/[?#]/)[0];
  }
}

/**
 * Summarize an error for logs without the request config, headers, body or query string.
 * Whole axios errors carry gateway credentials, phones and message text, so never log them directly.
 * @param {any} error Error.
 * @returns {object} Summary: message, code, status and safe URL.
 */
export function summarizeError(error: any): { message: string; code?: string; status?: number; method?: string; url?: string } {
  const summary: { message: string; code?: string; status?: number; method?: string; url?: string } = {
    message: error && typeof error.message === 'string' ? error.message : String(error),
  };
  if (error?.code !== undefined) summary.code = String(error.code);
  const status = error?.response?.status ?? error?.status;
  if (status !== undefined) summary.status = status;
  const config = error?.config;
  if (config) {
    if (config.method) summary.method = String(config.method).toUpperCase();
    const url = redactUrl(config.baseURL && config.url && !/^[a-z]+:\/\//i.test(config.url) ? `${config.baseURL}${config.url}` : config.url);
    if (url) summary.url = url;
  }
  return summary;
}
