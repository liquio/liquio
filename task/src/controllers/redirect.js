
const Controller = require('./controller');
const AuthService = require('../services/auth');

/**
 * Redirect controller.
 */
class RedirectController extends Controller {
  /**
   * Redirect controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Singleton.
    if (!RedirectController.singleton) {
      // Init params.
      super(config);
      this.authService = new AuthService();

      // Define singleton.
      RedirectController.singleton = this;
    }

    // Return singleton.
    return RedirectController.singleton;
  }

  /**
   * Auth.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async auth(req, res) {
    // Read state.
    const { state } = req.query;
    const stateQueryParam = state ? `&state=${state}` : '';

    // Define params.
    const { front, server, routes } = this.authService.provider;
    const idAuthUrl = `${front || server}${routes.getCode}`;
    const idAuthQueryParams = `?redirect_uri=${config.auth.authRedirectUrl}&client_id=${this.authService.provider.clientId}${stateQueryParam}`;
    const idAuthFullUrl = `${idAuthUrl}${idAuthQueryParams}`;
    const redirectUrl = idAuthFullUrl;

    // Redirect.
    this.redirect(res, redirectUrl);
  }

  /**
   * Logout.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async logout(req, res) {
    // Read state.
    const { state = '' } = req.query;
    const stateQueryParam = state ? `&state=${state}` : '';

    // Define params.
    const { front, server, routes } = this.authService.provider;
    const idLogoutUrl = `${front || server}${routes.logout}`;
    const idLogoutQueryParams = `?redirect_uri=${config.auth.authRedirectUrl}${stateQueryParam}`;
    const redirectUrl = `${idLogoutUrl}${idLogoutQueryParams}`;

    // Redirect.
    this.redirect(res, redirectUrl);
  }
}

module.exports = RedirectController;
