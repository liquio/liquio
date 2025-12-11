const Sequelize = require('sequelize');

const Model = require('./model');
const WorkflowTemplateEntity = require('../entities/workflow_template');
const RedisClient = require('../lib/redis_client');

const FIND_BY_ID_CACHE_TTL = 60; // 1 minute.

class WorkflowTemplateModel extends Model {
  constructor() {
    if (!WorkflowTemplateModel.singleton) {
      super();

      this.model = this.db.define(
        'workflowTemplate',
        {
          name: Sequelize.STRING,
          description: Sequelize.STRING,
          xml_bpmn_schema: Sequelize.TEXT,
          data: Sequelize.JSON,
          is_active: Sequelize.BOOLEAN,
          errors_subscribers: {
            allowNull: false,
            type: Sequelize.ARRAY(Sequelize.JSONB),
            defaultValue: [],
          },
        },
        {
          tableName: 'workflow_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.cacheTtl = {
        findAll: global.config.cache?.workflowTemplate?.findAll || 60, // 1 minute
        findByIdCached: global.config.cache?.findByIdCached || 60, // 1 minute
      };

      WorkflowTemplateModel.singleton = this;
    }

    return WorkflowTemplateModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<WorkflowTemplateEntity>}
   */
  async findById(id) {
    const workflowTemplate = await this.model.findByPk(id);

    return this.prepareEntity(workflowTemplate);
  }

  /**
   * Find by ID cached.
   * @param {number} id
   * @returns {Promise<WorkflowTemplateEntity>}
   */
  async findByIdCached(id) {
    const { data } = await RedisClient.getOrSet(
      RedisClient.createKey('workflow_template', 'findByIdCached', id),
      () => this.findById(id),
      this.cacheTtl.findByIdCached,
    );
    return data;
  }

  /**
   * Find ID and name and errors subscribers by ID.
   * @param {number} id ID.
   * @returns {Promise<{id: number, name: string, errorsSubscribers: object[]}>} Workflow template data.
   */
  async findIdAndNameAndErrorsSubscribersById(id) {
    const workflowTemplate = await this.model.findByPk(id, { attributes: ['id', 'name', 'errors_subscribers'] });

    return this.prepareEntity(workflowTemplate);
  }

  /**
   * Find ID and name and errors subscribers by ID cached.
   * @param {number} id ID.
   * @returns {Promise<{id: number, name: string, errorsSubscribers: object[]}>} Workflow template data.
   */
  async findIdAndNameAndErrorsSubscribersByIdCached(id) {
    const { data } = await RedisClient.getOrSet(
      `event.${WorkflowTemplateModel.name}.${id}.findIdAndNameAndErrorsSubscribersById`,
      () => this.findIdAndNameAndErrorsSubscribersById(id),
      FIND_BY_ID_CACHE_TTL,
    );
    return data;
  }

  /**
   * Get all.
   * @returns {Promise<WorkflowTemplateEntity[]>}
   */
  async getAll() {
    const workflowTemplates = await RedisClient.getOrSet(
      RedisClient.createKey('workflow_template', 'getAll'),
      () => this.model.findAll({ where: { is_active: true } }),
      this.cacheTtl.findAll,
    );

    return workflowTemplates.map((item) => this.prepareEntity(item));
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowTemplateEntity}
   */
  prepareEntity(item) {
    return new WorkflowTemplateEntity({
      id: item.id,
      name: item.name,
      description: item.description,
      xmlBpmnSchema: item.xml_bpmn_schema,
      data: item.data,
      isActive: item.is_active,
      errorsSubscribers: item.errors_subscribers,
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
      description: item.description,
      xml_bpmn_schema: item.xmlBpmnSchema,
      data: item.data,
      is_active: item.isActive,
      errors_subscribers: item.errorsSubscribers,
    };
  }
}

module.exports = WorkflowTemplateModel;
