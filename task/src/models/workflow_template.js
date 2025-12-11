const Sequelize = require('sequelize');

const Model = require('./model');
const WorkflowTemplateEntity = require('../entities/workflow_template');
const WorkflowTemplateCategoryModel = require('./workflow_template_category');
const RedisClient = require('../lib/redis_client');
const PgPubSub = require('../lib/pgpubsub');

// Constants.
const DEFAULT_CACHE_TTL = 300; // 5 minutes

class WorkflowTemplateModel extends Model {
  constructor() {
    if (!WorkflowTemplateModel.singleton) {
      super();

      this.model = this.db.define(
        'workflowTemplate',
        {
          workflow_template_category_id: {
            type: Sequelize.INTEGER,
            references: { model: 'document_template_categories', key: 'id' }
          },
          name: Sequelize.STRING,
          description: Sequelize.STRING,
          xml_bpmn_schema: Sequelize.TEXT,
          data: Sequelize.JSON,
          is_active: Sequelize.BOOLEAN,
          errors_subscribers: {
            allowNull: false,
            type: Sequelize.ARRAY(Sequelize.JSONB),
            defaultValue: []
          }
        },
        {
          tableName: 'workflow_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      this.model.prototype.prepareEntity = this.prepareEntity;
      this.workflowTemplateCategoryModel = new WorkflowTemplateCategoryModel();

      PgPubSub.getInstance().subscribe('workflow_template_row_change_notify', this.onRowChange.bind(this));

      this.cacheTtl = {
        findById: global.config.cache.workflowTemplate?.findById || DEFAULT_CACHE_TTL,
        getAll: global.config.cache.workflowTemplate?.getAll || DEFAULT_CACHE_TTL
      };

      WorkflowTemplateModel.singleton = this;
    }

    return WorkflowTemplateModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<WorkflowTemplateEntity[]>}
   */
  async getAll({ templateCategoryIds = [] } = {}) {
    const options = {
      attributes: {
        exclude: ['xml_bpmn_schema']
      },
      include: [{ model: global.models.workflowTemplateCategory.model }],
      order: [['created_at', 'asc']],
    };

    if (templateCategoryIds.length) {
      options.where = { workflow_template_category_id: templateCategoryIds };
    }

    const { data: workflowTemplates } = await RedisClient.getOrSet(
      RedisClient.createKey('workflow_template', 'getAll', templateCategoryIds.join(',')),
      () => this.model.findAll(options),
      this.cacheTtl.getAll,
    );

    let workflowTemplatesEntities = workflowTemplates.map(item => {
      let workflowTemplateEntity = this.prepareEntity(item);
      workflowTemplateEntity.workflowTemplateCategory = null;

      if (item.workflowTemplateCategory) {
        workflowTemplateEntity.workflowTemplateCategory = this.workflowTemplateCategoryModel.prepareEntity(
          item.workflowTemplateCategory
        );
      }

      return workflowTemplateEntity;
    });

    // Sort.
    const { workflowTemplates: workflowTemplatesOrder } = global.config.sort || {};
    if (workflowTemplatesOrder && Array.isArray(workflowTemplatesEntities)) {
      workflowTemplatesEntities = workflowTemplatesEntities.sort((a, b) => {
        const o = [...workflowTemplatesOrder].reverse();
        return o.indexOf(b.id) - o.indexOf(a.id);
      });
    }

    return workflowTemplatesEntities;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<WorkflowTemplateEntity>}
   */
  async findById(id) {
    const { data: workflowTemplate } = await RedisClient.getOrSet(
      RedisClient.createKey('workflow_template', 'findById', id),
      () => this.model.findByPk(id),
      this.cacheTtl.findById,
    );

    if (!workflowTemplate) { return; }

    return this.prepareEntity(workflowTemplate);
  }

  async getLatestUpdatedAt() {
    const [row] = await this.db.query('SELECT MAX(updated_at) AS updated_at FROM workflow_templates');
    return row?.updated_at;
  }

  async getUpdatedAtById(id) {
    const [row] = await this.db.query(
      'SELECT updated_at FROM workflow_templates WHERE id = :id',
      { replacements: { id } }
    );
    return row?.updated_at;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowTemplateEntity}
   */
  prepareEntity(item) {
    return new WorkflowTemplateEntity({
      id: item.id,
      workflowTemplateCategoryId: item.workflow_template_category_id,
      name: item.name,
      description: item.description,
      xmlBpmnSchema: item.xml_bpmn_schema,
      data: item.data,
      isActive: item.is_active,
      errorsSubscribers: item.errors_subscribers
    });
  }

  /**
   * Prepare for model.
   * @param {WorkflowTemplateEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      name: item.name,
      workflow_template_category_id: item.workflowTemplateCategoryId,
      description: item.description,
      xml_bpmn_schema: item.xmlBpmnSchema,
      data: item.data,
      errors_subscribers: item.errorsSubscribers
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
  onRowChange(channel, { id }) {
    const redis = RedisClient.getInstance();
    if (redis) {
      redis.delete(RedisClient.createKey('workflow_template', 'findById', id));
      redis.deleteMany(RedisClient.createKey('workflow_template', '*'));
    }
  }
}

module.exports = WorkflowTemplateModel;
