
const BaseProvider = require('./providers/provider');
const FileStorageProvier = require('./providers/filestorage');

// Constants.
const ERROR_MESSAGE_WRONG_PROVIDER = 'Wrong provider.';

/**
 * Storage service.
 */
class StorageService {
  /**
   * Storage constructor.
   * @param {BaseProvider} [Provider] Storage provider.
   */
  constructor(Provider = FileStorageProvier) {
    // Define singleton.
    if (!StorageService.singleton) {
      this.provider = new Provider(config.storage[Provider.name]);

      if (!(this.provider instanceof BaseProvider)) {
        throw new Error(ERROR_MESSAGE_WRONG_PROVIDER);
      }

      StorageService.singleton = this;
    }

    // Return singleton.
    return StorageService.singleton;
  }
}

module.exports = StorageService;
