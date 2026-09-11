import UnitModel from './unit';

// Constants.
const MODELS_CLASSES_LIST = {
  UnitModel,
};

/**
 * Models registry.
 */
class Models {
  models: Record<string, any>;
  static singleton: Models;

  /**
   * Models constructor.
   */
  constructor() {
    // Define singleton.
    if (!Models.singleton) {
      this.initModels();
      this.initRelationships();
      Models.singleton = this;
    }
    return Models.singleton;
  }

  /**
   * Classes list.
   */
  static get List(): typeof MODELS_CLASSES_LIST {
    return MODELS_CLASSES_LIST;
  }

  /**
   * Init models.
   * @private
   */
  private initModels(): void {
    // Define names of model classes.
    const namesOfModels = {
      unit: UnitModel,
    };

    // Init models.
    this.models = Object.entries(namesOfModels)
      .map((v) => [v[0], new (v[1] as any)()])
      .reduce(
        (t, v) => ({
          ...t,
          [v[0]]: v[1],
        }),
        {},
      );

    global.models = this.models;
  }

  /**
   * Init relationships.
   * @private
   */
  private initRelationships(): void {
    // Empty for now
  }
}

export default Models;
