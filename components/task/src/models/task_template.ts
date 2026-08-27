import Sequelize from 'sequelize';
import * as jsoncParser from 'jsonc-parser';

import { Model } from './model';
import { TaskTemplateEntity } from '../entities/task_template';
import { RedisClient } from '../lib/redis_client';
import { PgPubSub } from '../lib/pgpubsub';

// Constants.
const DEFAULT_CACHE_TTL = 300; // 5 minutes

export class TaskTemplateModel extends Model {
  private static singleton: TaskTemplateModel;

  model: any;
  cacheTtl: any;

  constructor() {
    if (!TaskTemplateModel.singleton) {
      super();

      this.model = this.db.define(
        'taskTemplate',
        {
          name: Sequelize.STRING,
          document_template_id: {
            type: Sequelize.INTEGER,
            references: { model: 'document_templates', key: 'id' },
          },
          json_schema: Sequelize.TEXT,
          html_template: Sequelize.TEXT,
        },
        {
          tableName: 'task_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      PgPubSub.getInstance().subscribe('task_template_row_change_notify', this.onRowChange.bind(this));

      this.cacheTtl = {
        findById: global.config.cache.taskTemplate?.findById || DEFAULT_CACHE_TTL,
        getAll: global.config.cache.taskTemplate?.getAll || DEFAULT_CACHE_TTL,
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
      this.cacheTtl.getAll,
    );

    return taskTemplates.map((item) => this.prepareEntity(item));
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<TaskTemplateEntity>}
   */
  async findById(id) {
    const { data: taskTemplate, isFromCache } = await RedisClient.getOrSet(
      RedisClient.createKey('task_template', 'findById', id),
      () => this.model.findByPk(id),
      this.cacheTtl.findById,
    );

    const taskTemplateEntity = this.prepareEntity(taskTemplate);

    global.log.save('task-template-find-by-id-debug', {
      id,
      isFromCache,
      hasJsonSchemaField: Object.prototype.hasOwnProperty.call(taskTemplate || {}, 'json_schema'),
      jsonSchemaRawType: typeof taskTemplate?.json_schema,
      jsonSchemaRawLength: typeof taskTemplate?.json_schema === 'string' ? taskTemplate.json_schema.length : null,
      parsedJsonSchemaKeys: Object.keys(taskTemplateEntity?.jsonSchema || {}),
    });

    return taskTemplateEntity;
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
    } catch (error) {
      global.log.save(
        'task-template-json-schema-parse-error',
        {
          id: item.id,
          error: error && error.message,
          jsonSchemaRawType: typeof item.json_schema,
          jsonSchemaRawLength: typeof item.json_schema === 'string' ? item.json_schema.length : null,
        },
        'warn',
      );

      jsonSchema = {};
    }

    return new TaskTemplateEntity({
      id: item.id,
      name: item.name,
      documentTemplateId: item.document_template_id,
      jsonSchema: jsonSchema,
      htmlTemplate: item.html_template,
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
