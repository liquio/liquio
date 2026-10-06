const ERRORS = {
  TOKEN_NOT_FOUND: { code: 100001, message: 'Token should be defined and has correct format.' },
  SIGNATURE_NOT_FOUND: { code: 100002, message: 'Signature should be defined and has correct format.' },
  INVALID_TOKEN: { code: 100003, message: 'Invalid or expired token.' },
  INCORRECT_SIGN: { code: 100004, message: 'Incorrect signature.' },
  CAN_NOT_FIND_CERT: { code: 100005, message: "Can't find signer certificate." },
  WRONG_SIGNED_CONTENT: { code: 100006, message: 'Wrong signed content.' },
  CAN_NOT_DEFINE_SIGNED_CONTENT: { code: 100007, message: "Can't define signed content." },
  CAN_NOT_GET_CERT_AS_PEM: { code: 100008, message: "Can't get certificate as PEM." },
  CAN_NOT_DOWNLOAD_EDS_SERVERS_LIST: { code: 100009, message: "Can't download EDS servers list." },
  CAN_NOT_DECODE_CERT: { code: 100010, message: "Can't decode cert." },
  VALIDATION_ERROR: { code: 100011, message: 'Validation error.' },
  JWT_SECRET_NOT_FOUND: { code: 100012, message: 'JWT secret not found in config.' },
};

export class Errors {
  /**
   * Errors list.
   */
  static get List() {
    return ERRORS;
  }

  /**
   * Get error by code.
   * @param {number} code Error code.
   */
  static getByCode(code: number) {
    return Object.values(Errors.List).find((v) => v.code === code);
  }

  /**
   * Get error by message.
   * @param {string} message Error message.
   */
  static getByMessage(message: string) {
    return Object.values(Errors.List).find((v) => v.message === message);
  }
}
