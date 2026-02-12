import BaseProvider from './providers/provider';
import LiquioIdProvider from './providers/liquio_id';

// Constants.
const ERROR_MESSAGE_WRONG_PROVIDER = 'Wrong provider.';

/**
 * Auth service.
 */
export default class AuthService {
  provider: BaseProvider;
  static singleton: AuthService;

  /**
   * Constructor.
   * @param Provider Auth provider class.
   */
  constructor(Provider: typeof BaseProvider = LiquioIdProvider as any) {
    if (!AuthService.singleton) {
      const providerName = (Provider as any).providerName || (Provider as any).name;
      this.provider = new (Provider as any)(global.config.auth[providerName]);

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
  static get ProvidersList(): Record<string, any> {
    return { Provider: BaseProvider, LiquioIdProvider };
  }
}
