import { testConsoleSmsAdapter } from './adapters/test_console_sms_adapter';
import { warnOnDefaultAdminPassword } from './lib/default_admin_password';

// Constants.
const ADAPTERS_LIST: Record<string, unknown> = { testConsoleSmsAdapter };
const DEFAULT_SMS_ADAPTER_NAME = 'testConsoleSmsAdapter';

/**
 * Warn about default admin password and select adapters to use.
 * @param {object} conf Config.
 * @param {object} log Log instance.
 * @returns {{sms: unknown}} Adapters.
 */
export function buildAdapters(conf: any, log: any): { sms: any } {
  // Warn when the admin password is still the shipped default (does not refuse to start, see the helper).
  warnOnDefaultAdminPassword(conf, log);

  // Define adapters to use.
  if (!conf.defaultMessenger) {
    log.save('sms-adapter-warning', { message: 'SMS adapter name not defined. Default will be used.' }, 'warn');
  }
  const smsAdapterName = conf.defaultMessenger || DEFAULT_SMS_ADAPTER_NAME;
  log.save('sms-adapter-used', { smsAdapterName });
  const adapters = {
    sms: ADAPTERS_LIST[smsAdapterName],
  };

  // Check.
  if (!adapters.sms) {
    log.save('sms-adapter-initialization-error', { smsAdapterName }, 'error');
  }

  return adapters;
}
