// Import.
import ExternalLinkProvider from './external';
import FilestorageLinkProvider from './filestorage';
import OpenStackLinkProvider from './open_stack';
import SimpleLinkProvider from './simple';

/**
 * Link providers.
 */
class LinkProviders {
  /**
   * Link providers constructor.
   * @param {{simple, openStack, filestorage}} providersConfig Providers config.
   */
  constructor(providersConfig) {
    // Define singleton.
    if (!LinkProviders.singleton) {
      this.list = {
        simple: new SimpleLinkProvider(providersConfig.simple),
        openStack: providersConfig.openStack && new OpenStackLinkProvider(providersConfig.openStack),
        filestorage: providersConfig.filestorage && new FilestorageLinkProvider(providersConfig.filestorage),
        external: providersConfig.external && new ExternalLinkProvider(providersConfig.external),
      };
      LinkProviders.singleton = this;
    }
    return LinkProviders.singleton;
  }
}

// Export.
export default LinkProviders;
