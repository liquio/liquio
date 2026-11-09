import jwt from 'jsonwebtoken';

import { ERROR_DOWNLOAD_TOKEN_INVALID } from '../constants/error';
import { checkDownloadTokenSecret } from './config_validation';
import { ForbiddenError } from './errors';

// Constants.
const DEFAULT_CONFIG = {
  lifetimeInSeconds: 3600,
};

/**
 * Download token.
 */
export class DownloadToken {
  private static singleton: DownloadToken;

  jwtSecret: any;
  lifetimeInSeconds: any;

  /**
   * Download token constructor.
   * @param {{ jwtSecret: string, lifetimeInSeconds: number }} [downloadTokenConfig] Download token config.
   */
  constructor(downloadTokenConfig: any = {}) {
    // Define singleton.
    if (!DownloadToken.singleton) {
      const { jwtSecret, lifetimeInSeconds } = { ...DEFAULT_CONFIG, ...downloadTokenConfig };

      if (!jwtSecret) {
        throw new Error('JWT secret is required to create download token.');
      }
      const secretProblem = checkDownloadTokenSecret(jwtSecret);
      if (secretProblem) {
        throw new Error(`Cannot create download token: ${secretProblem}`);
      }

      this.jwtSecret = jwtSecret;
      this.lifetimeInSeconds = lifetimeInSeconds;
      DownloadToken.singleton = this;
    }
    return DownloadToken.singleton;
  }

  /**
   * Generate JWT download token bound to the user.
   * @param {string} fileId File ID.
   * @param {string} userId ID of the user the token is issued to.
   * @returns {string} Download token.
   */
  generate(fileId: string, userId: string): string {
    if (!fileId || !userId) {
      throw new Error('fileId and userId are required to generate download token.');
    }

    // Define token data.
    const tokenData = { fileId, userId: String(userId) };

    // Return token.
    const token = jwt.sign(tokenData, this.jwtSecret, { expiresIn: this.lifetimeInSeconds });
    return token;
  }

  /**
   * Decrypt JWT download token and check it was issued to the requesting user.
   * @param {string} token Download token.
   * @param {string} userId ID of the requesting user.
   * @returns {string} File ID.
   * @throws {ForbiddenError} On invalid, expired, legacy or foreign token.
   */
  decrypt(token: string, userId: string): string {
    let payload: any;
    try {
      payload = jwt.verify(token, this.jwtSecret);
    } catch {
      throw new ForbiddenError(ERROR_DOWNLOAD_TOKEN_INVALID);
    }

    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.fileId !== 'string' ||
      !payload.fileId ||
      typeof payload.userId !== 'string' ||
      !payload.userId
    ) {
      throw new ForbiddenError(ERROR_DOWNLOAD_TOKEN_INVALID);
    }

    if (!userId || payload.userId !== String(userId)) {
      throw new ForbiddenError(ERROR_DOWNLOAD_TOKEN_INVALID);
    }

    return payload.fileId;
  }
}
