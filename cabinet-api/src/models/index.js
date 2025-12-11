const UnitModel = require('./unit');

// Constants.
const MODELS_CLASSES_LIST = {
  UnitModel,
};

class Models {
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
  static get List() {
    return MODELS_CLASSES_LIST;
  }

  /**
   * Init models.
   * @private
   */
  initModels() {
    // Define names of model classes.
    const namesOfModels = {
      unit: UnitModel,
    };

    // Init models.
    this.models = Object.entries(namesOfModels)
      .map((v) => [v[0], new v[1]()])
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

    global.models = this.models;
  }

  /**
   * Init relationships.
   * @private
   */
  initRelationships() {}
}

module.exports = Models;
