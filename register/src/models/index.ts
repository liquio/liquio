import RegisterModel from './register';
import KeyModel from './key';
import RecordModel from './record';
import HistoryModel from './history';
import AfterhandlerModel from './afterhandler';
import AccessLogModel from './access_log';

export interface ModelMap {
  register: RegisterModel;
  key: KeyModel;
  record: RecordModel;
  history: HistoryModel;
  afterhandler: AfterhandlerModel;
  accessLog: AccessLogModel;
}

/**
 * Models.
 */
export default class Models {
  private static singleton: Models;
  private config: any;
  public models: ModelMap;

  /**
   * Models constructor.
   * @param {object} config Config object.
   */
  constructor(config: any) {
    // Define singleton.
    if (!Models.singleton) {
      this.config = config;
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
      register: RegisterModel,
      key: KeyModel,
      record: RecordModel,
      history: HistoryModel,
      afterhandler: AfterhandlerModel,
      accessLog: AccessLogModel
    };

    // Init models.
    this.models = Object.entries(modelsByNames)
      .map((v) => [v[0], new v[1](this.config, { models: this.models })])
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
      ) as ModelMap;

    // Init models references.
    this.initReferences();
  }

  /**
   * Init references.
   */
  initReferences() {
    this.models.register.keyModel = this.models.key;
    this.models.register.model.hasMany(this.models.key.model, { foreignKey: 'register_id', targetKey: 'id' });

    // Record - history.
    this.models.record.historyModel = this.models.history;
    this.models.record.model.belongsTo(this.models.history.model, { foreignKey: 'id', targetKey: 'record_id' });

    // History - afterhandler.
    this.models.history.afterhandlerModel = this.models.afterhandler;
    this.models.history.model.belongsTo(this.models.afterhandler.model, { foreignKey: 'id', targetKey: 'history_id' });

    // Afterhandler - history.
    this.models.afterhandler.recordModel = this.models.record;
    this.models.afterhandler.historyModel = this.models.history;
    this.models.afterhandler.model.belongsTo(this.models.history.model, { foreignKey: 'history_id', targetKey: 'id' });
  }

  getHandler(modelName: string, methodName: string): Function {
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
