import { TestController } from './test';
import { AuthController } from './auth';
import { ContainersController } from './containers';
import { FilesController } from './files';
import { SignaturesController } from './signatures';
import { P7sSignaturesController } from './p7s_signatures';

export class Controllers {
  static singleton: Controllers;

  config: any;
  controllers: any;

  /**
   * Controllers constructor.
   * @param {object} config Config object.
   */
  constructor(config?: any) {
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
  getHandler(controllerName: string, methodName: string) {
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
    const controllersClasses: any = {
      test: TestController,
      auth: AuthController,
      containers: ContainersController,
      files: FilesController,
      signatures: SignaturesController,
      p7sSignatures: P7sSignaturesController,
    };

    // Init controllers.
    this.controllers = Object.entries(controllersClasses)
      .map((v: any) => [v[0], new v[1](this.config)])
      .reduce(
        (t, v) => ({
          ...t,
          ...(() => {
            const n: any = {};
            n[v[0]] = v[1];
            return n;
          })(),
        }),
        {},
      );
  }
}
