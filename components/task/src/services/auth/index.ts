import { Provider as BaseProvider } from './providers/provider';
import { LiquioIdProvider } from './providers/liquio_id';

// Constants.
const ERROR_MESSAGE_WRONG_PROVIDER = 'Wrong provider.';

export class AuthService {
  private static singleton: AuthService;
  provider: any;

  /**
   * Constructor.
   * @param {BaseProvider} [Provider] Auth provider.
   */
  constructor(Provider = LiquioIdProvider) {
    if (!AuthService.singleton) {
      this.provider = new Provider(config.auth[Provider.name]);

      if (!(this.provider instanceof BaseProvider)) {
        throw new Error(ERROR_MESSAGE_WRONG_PROVIDER);
      }

      AuthService.singleton = this;
    }

    return AuthService.singleton;
  }

  /**
   * Get providers list.
   */
  static get ProvidersList() {
    return { Provider: BaseProvider, LiquioIdProvider };
  }
}
