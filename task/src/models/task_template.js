const Sequelize = require('sequelize');
const jsoncParser = require('jsonc-parser');

const Model = require('./model');
const TaskTemplateEntity = require('../entities/task_template');
const RedisClient = require('../lib/redis_client');
const PgPubSub = require('../lib/pgpubsub');

// Constants.
const DEFAULT_CACHE_TTL = 300; // 5 minutes

class TaskTemplateModel extends Model {
  constructor() {
    if (!TaskTemplateModel.singleton) {
      super();

      this.model = this.db.define(
        'taskTemplate',
        {
          name: Sequelize.STRING,
          document_template_id: {
            type: Sequelize.INTEGER,
            references: { model: 'document_templates', key: 'id' }
          },
          json_schema: Sequelize.TEXT,
          html_template: Sequelize.TEXT
        },
        {
          tableName: 'task_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      PgPubSub.getInstance().subscribe('task_template_row_change_notify', this.onRowChange.bind(this));

      this.cacheTtl = {
        findById: global.config.cache.taskTemplate?.findById || DEFAULT_CACHE_TTL,
        getAll: global.config.cache.taskTemplate?.getAll || DEFAULT_CACHE_TTL
      };

      this.model.prototype.prepareEntity = this.prepareEntity;

      TaskTemplateModel.singleton = this;
    }

    return TaskTemplateModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<TaskTemplateEntity[]>}
   */
  async getAll() {
    const { data: taskTemplates } = await RedisClient.getOrSet(
      RedisClient.createKey('task_template', 'getAll'),
      () => this.model.findAll({ attributes: ['id', 'name'] }),
      this.cacheTtl.getAll
    );

    return taskTemplates.map(item => this.prepareEntity(item));
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<TaskTemplateEntity>}
   */
  async findById(id) {
    const { data: taskTemplate } = await RedisClient.getOrSet(
      RedisClient.createKey('task_template', 'findById', id),
      () => this.model.findByPk(id),
      this.cacheTtl.findById
    );

    return this.prepareEntity(taskTemplate);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {TaskTemplateEntity}
   */
  prepareEntity(item) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    let jsonSchema;
    try {
      jsonSchema = jsoncParser.parse(item.json_schema);
    } catch {
      jsonSchema = {};
    }

    return new TaskTemplateEntity({
      id: item.id,
      name: item.name,
      documentTemplateId: item.document_template_id,
      jsonSchema: jsonSchema,
      htmlTemplate: item.html_template
    });
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
  onRowChange(channel, { id }) {
    const redis = RedisClient.getInstance();
    if (redis) {
      redis.delete(RedisClient.createKey('task_template', 'findById', id));
      redis.delete(RedisClient.createKey('task_template', 'getAll'));
    }
  }
}

module.exports = TaskTemplateModel;
