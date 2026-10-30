import { OpenStack } from './openstack';
import { Minio } from './minio';
import { getLog } from '../lib/context';

const PROVIDERS_LIST: any[] = [OpenStack, Minio];

/**
 * Providers.
 * @typedef {import('./provider')} Provider
 */
export class Providers {
  static singleton: Providers;

  config: any;
  activeProvider: any;

  /**
   * Providers constructor.
   * @param {object} config Providers config.
   */
  constructor(config: any) {
    // Singleton.
    if (!Providers.singleton) {
      // Save params.
      this.config = config;
      this.activeProvider = null;

      // Define singleton.
      Providers.singleton = this;
    }

    // Return singleton.
    return Providers.singleton;
  }

  /**
   * Init.
   */
  init() {
    // Define active provider class.
    const { activeProvider: activeProviderName } = this.config;
    if (!activeProviderName) {
      getLog().save('provider-not-used', { activeProviderName: activeProviderName || null });
      return;
    }
    const ActiveProvider: any = Providers.List.find((v: any) => v.ProviderName === activeProviderName);
    if (!ActiveProvider) {
      getLog().save('provider-class-definition-error', { activeProviderName });
      process.exit(1);
    }

    // Define consig.
    const activeProviderConfig = this.config.list[activeProviderName];
    if (!activeProviderConfig) {
      getLog().save('provider-config-definition-error', { activeProviderName });
      process.exit(1);
    }

    // Init active provider.
    this.activeProvider = new ActiveProvider(activeProviderConfig);
    getLog().save('provider-initialized', { activeProviderName });
  }

  /**
   * List.
   * @returns {(instanceof Provider)[]} Providers classes list.
   */
  static get List() {
    return PROVIDERS_LIST;
  }
}
