// Import.
import LinksModel from './links';
import TemplateModel from './template';

/**
 * Models.
 */
class Models {
  /**
   * Models constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!Models.singleton) {
      this.config = config;
      this.initModels();
      Models.singleton = this;
    }
    return Models.singleton;
  }

  /**
   * Init models.
   * @private
   */
  initModels() {
    // Define models classses.
    const modelsByNames = {
      links: LinksModel,
      template: TemplateModel,
    };

    // Init models.
    this.models = Object.entries(modelsByNames)
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

  /**
   * Get handler.
   * @param {string} modelName Model name.
   * @param {string} methodName Method name.
   * @returns {function}
   */
  getHandler(modelName, methodName) {
    // Define model.
    const model = this.models[modelName];
    if (!model) {
      return;
    }

    // Define method.
    const method = model[methodName];
    if (!method) {
      return;
    }

    // Return method with model's context.
    const handler = method.bind(model);
    return handler;
  }
}

// Export.
export default Models;
