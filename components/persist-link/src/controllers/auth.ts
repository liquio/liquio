// Import.
import Controller from './controller';

/**
 * Auth controller.
 */
class AuthController extends Controller {
  /**
   * Auth controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    super(config);

    // Define singleton.
    if (!AuthController.singleton) {
      AuthController.singleton = this;
    }
    return AuthController.singleton;
  }

  /**
   * Basic auth.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @param {object} next Next request handler.
   */
  basicAuth(req, res, next) {
    // Define params.
    const { token } = req.headers;
    const availableTokens = this.config.auth.tokens;

    // Check token.
    const isCorrectToken = availableTokens.includes(token);
    if (!isCorrectToken) {
      return this.responseError(res, 'Incorrect basic auth token.', 401);
    }

    // Go next in other cases.
    next();
  }
}

// Export.
export default AuthController;
