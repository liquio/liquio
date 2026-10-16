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
