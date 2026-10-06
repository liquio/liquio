import bcrypt from 'bcrypt';

import { Config } from '../config';
import { BaseService } from './base_service';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_ATTEMPTS = 5;
export const MAX_ATTEMPT_DELAY = 60 * 60; // 1 hour in seconds
export const HASHING_SALT_ROUNDS = 10;
export const REMEMBER_LAST_PASSWORDS = 5;

export class PasswordManagerService extends BaseService {
  private readonly cfg: Config['passwordManager'];
  private readonly characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  public readonly minPasswordLength: number;
  public readonly maxAttempts: number;
  public readonly maxAttemptDelay: number;
  public readonly hashingSaltRounds: number;
  public readonly rememberLastPassword: number;

  constructor(...args: ConstructorParameters<typeof BaseService>) {
    super(...args);

    this.cfg = this.config.passwordManager;

    this.minPasswordLength = this.cfg?.minPasswordLength ?? MIN_PASSWORD_LENGTH;
    this.maxAttempts = this.cfg?.maxAttempts ?? MAX_ATTEMPTS;
    this.maxAttemptDelay = this.cfg?.maxAttemptDelay ?? MAX_ATTEMPT_DELAY;
    this.hashingSaltRounds = this.cfg?.hashingSaltRounds ?? HASHING_SALT_ROUNDS;
    this.rememberLastPassword = this.cfg?.rememberLastPasswords ?? REMEMBER_LAST_PASSWORDS;
  }

  /**
   * Check if the password is strong enough.
   * @param {string} password
   * @returns {{ strong: boolean, reason?: string }}
   */
  isStrongPassword(password: string): { strong: boolean; reason?: string } {
    if (password.length < this.minPasswordLength) {
      return { strong: false, reason: `Password must be at least ${this.minPasswordLength} characters long.` };
    }

    if (!/[A-ZА-Я]/.exec(password)) {
      return { strong: false, reason: 'Password must contain at least one capital letter.' };
    }

    if (!/[^a-zA-Z0-9]/.exec(password)) {
      return { strong: false, reason: 'Password must contain at least one special character.' };
    }

    if (!/\d/.exec(password)) {
      return { strong: false, reason: 'Password must contain at least one digit.' };
    }

    return { strong: true };
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, this.hashingSaltRounds);
  }

  async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  verifyPasswordSync(password: string, hash: string) {
    return bcrypt.compareSync(password, hash);
  }

  /**
   * Generate a secure random token.
   * @param {number} [length] Length of the token to generate (default is 32)
   * @returns {string} The generated token.
   */
  generateSecureToken(length: number = 32): string {
    let token = '';
    for (let i = 0; i < length; i++) {
      token += this.characters.charAt(Math.floor(Math.random() * this.characters.length));
    }
    return token;
  }
}
