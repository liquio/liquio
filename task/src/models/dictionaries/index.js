
const DictionaryModel = require('./dictionary');
const TaskTagDictionaryModel = require('./task_tag');
const WorkflowStatusDictionaryModel = require('./workflow_status');

// Constants.
const MODEL_CLASSES = [
  TaskTagDictionaryModel,
  WorkflowStatusDictionaryModel
];
const ERROR_BASE_MODEL = 'Must be extends of DictionaryModel.';

class DictionaryModels {
  /**
   * Constructor.
   * @param {typeof DictionaryModel[]} customModels Custom dictionary models list.
   */
  constructor(customModels = []) {
    // Define singleton.
    if (!DictionaryModels.singleton) {
      this.initModels(customModels);
      DictionaryModels.singleton = this;
    }
    return DictionaryModels.singleton;
  }

  /**
   * Class list.
   */
  static get List() {
    return MODEL_CLASSES;
  }

  /**
   * Get dictionary base class.
   */
  static get dictionaryBase() {
    return DictionaryModel;
  }

  /**
   * Init models.
   * @param {typeof DictionaryModel[]} customModels Custom models.
   * @private
   */
  initModels(customModels) {
    const models = [...MODEL_CLASSES, ...customModels];

    this.models = [];

    for (const model of models) {
      const instance = new model();

      if (!(instance instanceof DictionaryModel)) {
        throw new Error(ERROR_BASE_MODEL);
      }

      this.models.push(instance);
    }
  }

  /**
   * Get all.
   * @returns {Promise<object[]>}
   */
  async getAll() {
    let dictionaries = {};

    for (const model of this.models) {
      dictionaries[model.name] = await model.getAll();
    }

    return dictionaries;
  }

  /**
   * Get by name.
   * @param {string} name Name.
   * @returns {Promise<object[]>}
   */
  async getByName(name) {
    const model = this.models.find(model => {
      return model.name === name;
    });

    if (!model) {
      return;
    }

    return await model.getAll();
  }
}

module.exports = DictionaryModels;
