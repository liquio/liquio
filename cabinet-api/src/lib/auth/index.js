const BaseProvider = require('./providers/provider');
const LiquioIdProvider = require('./providers/liquio_id');

// Constants.
const ERROR_MESSAGE_WRONG_PROVIDER = 'Wrong provider.';

class AuthService {
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

module.exports = AuthService;
