const Sequelize = require('sequelize');

const Model = require('./model');
const WorkflowTemplateCategoryEntity = require('../entities/workflow_template_category');
const RedisClient = require('../lib/redis_client');
const PgPubSub = require('../lib/pgpubsub');

// Constants.
const DEFAULT_CACHE_TTL = 600; // 10 minutes

class WorkflowTemplateCategoryModel extends Model {
  constructor() {
    if (!WorkflowTemplateCategoryModel.singleton) {
      super();

      this.model = this.db.define(
        'workflowTemplateCategory',
        {
          parent_id: Sequelize.INTEGER,
          name: Sequelize.STRING
        },
        {
          tableName: 'workflow_template_categories',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      PgPubSub.getInstance().subscribe('workflow_template_category_row_change_notify', this.onRowChange.bind(this));

      this.cacheTtl = {
        getAll: global.config.cache.workflowTemplateCategory?.getAll || DEFAULT_CACHE_TTL
      };

      WorkflowTemplateCategoryModel.singleton = this;
    }

    return WorkflowTemplateCategoryModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<WorkflowTemplateCategoryEntity[]>}
   */
  async getAll() {
    const { data: workflowTemplateCategories } = await RedisClient.getOrSet(
      RedisClient.createKey('workflow_template_category', 'getAll'),
      () => this.model.findAll(),
      this.cacheTtl.getAll
    );

    return workflowTemplateCategories.map(item => this.prepareEntity(item));
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowTemplateCategoryEntity}
   */
  prepareEntity(item) {
    return new WorkflowTemplateCategoryEntity({
      id: item.id,
      parentId: item.parent_id,
      name: item.name
    });
  }

  /**
   * Prepare for model.
   * @param {WorkflowTemplateCategoryEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      parent_id: item.parentId,
      name: item.name
    };
  }

  /**
   * Invalidate cache on row change.
   * @private
   * @param {string} channel Channel.
   * @param {NotifyData} data Data.
   *
   * @typedef {Object} NotifyData
   * @property {number} id Row ID.
   * @property {'INSERT' | 'UPDATE' | 'DELETE'} action Action.
   * @property {string} table Table name.
   */
  onRowChange(_channel, { id: _id }) {
    const redis = RedisClient.getInstance();
    if (redis) {
      redis.delete(RedisClient.createKey('workflow_template_category', 'getAll'));
    }
  }
}

module.exports = WorkflowTemplateCategoryModel;
