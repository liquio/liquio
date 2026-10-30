import path from 'node:path';

import { initIdApiClient } from './lib/id_api';
import { testConsoleSmsAdapter } from './adapters/test_console_sms_adapter';
import { warnOnDefaultAdminPassword } from './lib/default_admin_password';
import { setAppContext } from './lib/context';

// Constants.
const ADAPTERS_LIST: Record<string, unknown> = { testConsoleSmsAdapter };
const DEFAULT_SMS_ADAPTER_NAME = 'testConsoleSmsAdapter';
const ADMIN_DIRECTORY = '/admin';

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

/**
 * Start.
 * @param {object} config Config.
 * @param {string} adminStaticDir Admin static directory path.
 * @param {{sms: {sendSms, sendOneSms, getSMSQueue, getSMSQueueCounter, getSMSLog}}} adapters Custom adapters.
 */
const start = function (config: any, adminStaticDir: string = path.join(__dirname, ADMIN_DIRECTORY), adapters: any = {}): any {
  setAppContext({ conf: config.conf });
  initIdApiClient(config.conf.auth_server);
  setAppContext({ env: config.env, adminStaticDir, extensions: { adapters } });
  // Deferred require: server.ts reads conf/env/adminStaticDir/extensions from the app context
  // at module-load time, so it must not be imported until this function has set them.

  return require('./server').server;
};

export default start;
