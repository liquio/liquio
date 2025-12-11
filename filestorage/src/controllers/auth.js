const Controller = require('./controller');
const { appendTraceMeta } = require('../lib/async_local_storage');

/**
 * Auth controller.
 */
class AuthController extends Controller {
  /**
   * Auth controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!AuthController.singleton) {
      super(config);
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
    const { token: tokenHeader, authorization: authorizationHeader } = req.headers;
    const token = tokenHeader || authorizationHeader;
    const availableTokens = this.config.auth.tokens;

    // Check token in config.
    const isCorrectToken = availableTokens.includes(token);
    if (!isCorrectToken) {
      return this.responseError(res, 'Unknown basic auth token.', 401);
    }

    // Check token parts.
    const tokenParts = token.split(' ');
    const [basicKeyword, base64TokenPart] = tokenParts;
    if (basicKeyword !== 'Basic') {
      return this.responseError(res, 'Wrong auth type.', 401);
    }

    // Parse token.
    const parsedTokenParts = Buffer.from(base64TokenPart, 'base64').toString('utf8').split(':');
    if (parsedTokenParts.length !== 2) {
      return this.responseError(res, 'Incorrect basic auth token.', 401);
    }

    // Get user.
    const [user] = parsedTokenParts;
    req.auth = { user };

    appendTraceMeta({ user });
    // Go next in other cases.
    next();
  }
}

// Export.
module.exports = AuthController;
