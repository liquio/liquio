import { loadConfig } from '../config';

/**
 * Update user by ID.
 * @param {string} ipn User ipn.
 * @param {string} edrpou User edrpou.
 * @returns {string} userCode User code. Example: 123456789-87654321
 */
export function calculateUserCode(ipn: string = '', edrpou: string = ''): string {
  if (typeof ipn !== 'string' || (!!edrpou && typeof edrpou !== 'string')) {
    const error = Error('Calculate user code error. ipn and edrpou must be string.');
    (error as any).details = { ipn, edrpou };
    throw error;
  }

  let userCode = ipn;

  // If user authorized "legal key" and separateLegalUsers is ON, userCode = '1234567890-12345678';
  if (loadConfig().separateLegalUsers && edrpou && edrpou.length === 8) {
    userCode += `-${edrpou}`;
  }

  return userCode;
}
