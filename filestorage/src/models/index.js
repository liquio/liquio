const ContainerModel = require('./container');
const FileModel = require('./file');
const SignatureModel = require('./signature');
const P7sSignatureModel = require('./p7s_signature');

/**
 * Models.
 */
class Models {
  /**
   * Models constructor.
   * @param {object} config Config object.
   * @param {object} provider Provider.
   */
  constructor(config, provider) {
    // Define singleton.
    if (!Models.singleton) {
      this.config = config;
      this.provider = provider;
      Models.singleton = this;
    }
    return Models.singleton;
  }

  /**
   * Init models.
   */
  init() {
    // Define models classses.
    const modelsByNames = {
      container: ContainerModel,
      file: FileModel,
      signature: SignatureModel,
      p7sSignature: P7sSignatureModel,
    };

    // Init models.
    this.models = Object.entries(modelsByNames)
      .map((v) => [v[0], new v[1](this.config, this.provider)])
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
module.exports = Models;
