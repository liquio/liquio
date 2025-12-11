const OpenStackProvider = require('./openstack');
const MinioProvider = require('./minio');

const PROVIDERS_LIST = [OpenStackProvider, MinioProvider];

/**
 * Providers.
 * @typedef {import('./provider')} Provider
 */
class Providers {
  /**
   * Providers constructor.
   * @param {object} config Providers config.
   */
  constructor(config) {
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
      log.save('provider-not-used', { activeProviderName: activeProviderName || null });
      return;
    }
    const ActiveProvider = Providers.List.find((v) => v.ProviderName === activeProviderName);
    if (!ActiveProvider) {
      log.save('provider-class-definition-error', { activeProviderName });
      process.exit(1);
    }

    // Define consig.
    const activeProviderConfig = this.config.list[activeProviderName];
    if (!activeProviderConfig) {
      log.save('provider-config-definition-error', { activeProviderName });
      process.exit(1);
    }

    // Init active provider.
    this.activeProvider = new ActiveProvider(activeProviderConfig);
    log.save('provider-initialized', { activeProviderName });
  }

  /**
   * List.
   * @returns {(instanceof Provider)[]} Providers classes list.
   */
  static get List() {
    return PROVIDERS_LIST;
  }
}

// Export.
module.exports = Providers;
