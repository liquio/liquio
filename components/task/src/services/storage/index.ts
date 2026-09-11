import { Provider as BaseProvider } from './providers/provider';
import { FileStorageProvider } from './providers/filestorage';

// Constants.
const ERROR_MESSAGE_WRONG_PROVIDER = 'Wrong provider.';

/**
 * Storage service.
 */
export class StorageService {
  private static singleton: StorageService;
  provider: any;

  /**
   * Storage constructor.
   * @param {BaseProvider} [Provider] Storage provider.
   */
  constructor(Provider = FileStorageProvider) {
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
