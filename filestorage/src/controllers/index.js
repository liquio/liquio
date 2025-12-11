const TestController = require('./test');
const AuthController = require('./auth');
const ContainersController = require('./containers');
const FilesController = require('./files');
const SignaturesController = require('./signatures');
const P7sSignaturesController = require('./p7s_signatures');

class Controllers {
  /**
   * Controllers constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!Controllers.singleton) {
      this.config = config;
      this.initControllers();
      Controllers.singleton = this;
    }
    return Controllers.singleton;
  }

  /**
   * Get handler.
   * @param {string} controllerName Controller name.
   * @param {string} methodName Method name.
   * @returns {function}
   */
  getHandler(controllerName, methodName) {
    // Define controller.
    const controller = this.controllers[controllerName];
    if (!controller) {
      return;
    }

    // Define method.
    const method = controller[methodName];
    if (!method) {
      return;
    }

    // Return method with controller's context.
    const handler = method.bind(controller);
    return handler;
  }

  /**
   * Init controllers.
   * @private
   */
  initControllers() {
    // Define controllers classses.
    const controllersClasses = {
      test: TestController,
      auth: AuthController,
      containers: ContainersController,
      files: FilesController,
      signatures: SignaturesController,
      p7sSignatures: P7sSignaturesController,
    };

    // Init controllers.
    this.controllers = Object.entries(controllersClasses)
      .map((v) => [v[0], new v[1](this.config)])
      .reduce(
        (t, v) => ({
          ...t,
          ...(() => {
            let n = {};
            n[v[0]] = v[1];
            return n;
          })(),
        }),
        {},
      );
  }
}

// Export.
module.exports = Controllers;
