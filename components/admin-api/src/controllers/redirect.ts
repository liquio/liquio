import { Controller } from './controller';

/**
 * Redirect controller.
 */
export class RedirectController extends Controller {
  private static singleton: RedirectController;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!RedirectController.singleton) {
      super(config);
      RedirectController.singleton = this;
    }
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

    // Define params.
    const idAuthUrl = `${this.config.auth.front || this.config.auth.server}:${this.config.auth.frontPort || this.config.auth.port}/authorise`;
    const idAuthQueryParams = `?${new URLSearchParams({
      redirect_uri: global.config.auth.authRedirectUrl,
      client_id: this.config.auth.clientId,
      ...(state ? { state: String(state) } : {}),
    }).toString()}`;
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
    // Define params.
    const serverPublicUrl =
      this.config.auth.serverPublicUrl ||
      `${this.config.auth.front || this.config.auth.server}:${this.config.auth.frontPort || this.config.auth.port}`;
    const idLogoutUrl = `${serverPublicUrl}/logout`;
    const idLogoutQueryParams = `?redirect_uri=${global.config.auth.authRedirectUrl}`;
    const redirectUrl = `${idLogoutUrl}${idLogoutQueryParams}`;

    // Redirect.
    this.redirect(res, redirectUrl);
  }
}
