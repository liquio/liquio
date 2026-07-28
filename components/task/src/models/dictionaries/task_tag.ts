import Sequelize from 'sequelize';
import { DictionaryModel as Dictionary } from './dictionary';

export class TaskTagDictionaryModel extends Dictionary {
  private static singleton: TaskTagDictionaryModel;

  model: any;

  constructor() {
    if (!TaskTagDictionaryModel.singleton) {
      super();

      this.model = this.db.define(
        'taskTag',
        {
          name: Sequelize.STRING
        },
        {
          tableName: 'task_tags',
          underscored: true,
          defaultScope: {
            attributes: {
              exclude: ['created_at', 'updated_at']
            }
          }
        }
      );

      TaskTagDictionaryModel.singleton = this;
    }

    return TaskTagDictionaryModel.singleton;
  }

  /**
   * Get dictionary name.
   * @returns {string}
   */
  get name() {
    return 'task-tags';
  }

  /**
   * Get all data.
   * @returns {Promise<object[]>}
   */
  async getAll() {
    return await this.model.findAll();
  }
}

