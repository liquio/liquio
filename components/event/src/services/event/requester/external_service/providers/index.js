const TrembitaProvider = require('./trembita');
const StandardProvider = require('./standard');
const StandardTrembitaProvider = require('./standard_trembita');
const SignerProvider = require('./signer');

/**
 * Providers.
 */
class Providers {
  /**
   * Providers constructor.
   */
  constructor(config, _registerConfig, pluginRegistry) {
    // Initialize all configured providers
    Object.keys(config).forEach((key) => {
      const providerConfig = config[key];
      const providerType = providerConfig.providerType || 'standard';

      switch (providerType) {
        case 'trembita':
          this[key] = new TrembitaProvider(providerConfig);
          break;
        case 'standardTrembita':
          this[key] = new StandardTrembitaProvider(providerConfig);
          break;
        case 'signer':
          this[key] = new SignerProvider(providerConfig);
          break;
        case 'standard':
          this[key] = new StandardProvider(providerConfig);
          break;
        case 'plugin':
          this[key] = pluginRegistry ? pluginRegistry.get(providerConfig.pluginName) : undefined;
          if (!this[key]) {
            throw new Error(
              `Unknown or unloaded plugin "${providerConfig.pluginName}" for external service "${key}"`,
            );
          }
          break;
        default:
          throw new Error(`Unknown provider type: "${providerType}" for external service "${key}"`);
      }
    });
  }
}

module.exports = Providers;
