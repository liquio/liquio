import crypto from 'crypto';

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createChallenge } from 'altcha-lib';
import moment from 'moment';

import { ConfigurationService } from '@components/configuration/configuration.service';
import { Configuration } from '@components/configuration/configuration.types';

import { Challenge } from './captcha.dto';

@Injectable()
export class CaptchaService {
  private readonly cfg: Configuration['captcha'];

  constructor(private readonly config: ConfigurationService) {
    this.cfg = config.get('captcha') || {};
  }

  get isEnabledFor(): string[] {
    const isEnabledFor = !this.cfg.isEnabled ? [] : this.cfg.isEnabledFor || [];

    if (!Array.isArray(isEnabledFor)) {
      throw new InternalServerErrorException('Invalid captcha configuration');
    }

    return isEnabledFor;
  }

  /**
   * Generates an array of HMAC keys based on the configured HMAC key and current time.
   * @returns An array of HMAC keys generated based on the configured HMAC key and current time.
   */
  getHmacKeys(): string[] {
    const { hmacKey } = this.cfg;

    if (!hmacKey) {
      throw new InternalServerErrorException('HMAC key is not configured for captcha service');
    }

    return Array(5)
      .fill(null)
      .map((index) => {
        const date = moment().subtract(index, 'minutes').format('YYYY-MM-DD HH:mm');
        return crypto.createHmac('sha256', hmacKey).update(date).digest('hex');
      });
  }

  /**
   * Returns a list of providers that are enabled for captcha.
   * @returns An array of providers that are enabled for captcha.
   */
  getCaptchaProviderList(): string[] {
    return this.isEnabledFor;
  }

  /**
   * Generates a captcha challenge for the specified service and method.
   * @param service Provider service name
   * @param method Method name for the service
   * @returns A captcha challenge or null if not enabled
   */
  async getCaptcha(service: string, method: string): Promise<Challenge | null> {
    const { isEnabled } = this.cfg;

    // Skip if captcha is not enabled
    if (!isEnabled) {
      return null;
    }

    // Skip if the service or method is not in the enabled list
    if (
      !this.isEnabledFor.includes([service, '*'].join('.')) &&
      !this.isEnabledFor.includes([service, method].join('.'))
    ) {
      return null;
    }

    const [hmacKey] = this.getHmacKeys();
    return await createChallenge({ hmacKey });
  }
}
