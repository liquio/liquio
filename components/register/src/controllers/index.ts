import TestController from './test';
import AuthController from './auth';
import RegistersController from './registers';
import KeysController from './keys';
import RecordsController from './records';
import AccessLogController from './access_log';
import CustomController from './custom';
import ExportController from './export';
import ImportController from './import';
import RollbackController from './rollback';
import Controller from './controller';

export default class Controllers {
  static singleton: Controllers;

  config: object;
  controllers: Record<string, Controller>;

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
    return (req, res, next) => {
      Promise.resolve(handler(req, res, next)).catch(next);
    };
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
      registers: RegistersController,
      keys: KeysController,
      records: RecordsController,
      accessLog: AccessLogController,
      custom: CustomController,
      export: ExportController,
      import: ImportController,
      rollback: RollbackController
    };

    // Init controllers.
    this.controllers = Object.entries(controllersClasses)
      .map((v) => {
        const name = v[0];
        const initializedController = new v[1](this.config);
        initializedController.name = name;
        return [name, initializedController];
      })
      .reduce(
        (t, v) => ({
          ...t,
          ...(() => {
            const n = {};
            n[v[0] as any] = v[1];
            return n;
          })()
        }),
        {}
      );
  }
}
