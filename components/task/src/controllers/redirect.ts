import { Controller } from './controller';

// Constants.
const DEFAULT_GET_CODE_ROUTE = '/authorise';

/**
 * Redirect controller.
 */
export class RedirectController extends Controller {
  private static singleton: RedirectController;

  idConfig: any;

  /**
   * Redirect controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Singleton.
    if (!RedirectController.singleton) {
      // Init params.
      super(config);
      this.idConfig = config.auth?.LiquioId || {};

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
    const { front, server, routes, clientId } = this.idConfig;
    const idAuthUrl = `${front || server}${routes?.getCode || DEFAULT_GET_CODE_ROUTE}`;
    const idAuthQueryParams = `?redirect_uri=${global.config.auth.authRedirectUrl}&client_id=${clientId}${stateQueryParam}`;
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
    const { front, server, routes } = this.idConfig;
    const idLogoutUrl = `${front || server}${routes?.logout}`;
    const idLogoutQueryParams = `?redirect_uri=${global.config.auth.authRedirectUrl}${stateQueryParam}`;
    const redirectUrl = `${idLogoutUrl}${idLogoutQueryParams}`;

    // Redirect.
    this.redirect(res, redirectUrl);
  }
}
