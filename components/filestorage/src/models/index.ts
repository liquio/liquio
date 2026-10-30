import { ContainerModel } from './container';
import { FileModel } from './file';
import { SignatureModel } from './signature';
import { P7sSignatureModel } from './p7s_signature';

/**
 * Models.
 */
export class Models {
  static singleton: Models;

  config: any;
  provider: any;
  models: any;

  /**
   * Models constructor.
   * @param {object} config Config object.
   * @param {object} provider Provider.
   */
  constructor(config?: any, provider?: any) {
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
    const modelsByNames: any = {
      container: ContainerModel,
      file: FileModel,
      signature: SignatureModel,
      p7sSignature: P7sSignatureModel,
    };

    // Init models.
    this.models = Object.entries(modelsByNames)
      .map((v: any) => [v[0], new v[1](this.config, this.provider)])
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

  /**
   * Get handler.
   * @param {string} modelName Model name.
   * @param {string} methodName Method name.
   * @returns {function}
   */
  getHandler(modelName: string, methodName: string) {
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
