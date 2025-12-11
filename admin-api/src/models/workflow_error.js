const Sequelize = require('sequelize');
const Model = require('./model');
const WorkflowErrorEntity = require('../entities/workflow_error');

class WorkflowErrorModel extends Model {
  constructor(dbInstance) {
    if (!WorkflowErrorModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'workflowError',
        {
          workflow_id: {
            type: Sequelize.UUID,
            references: { model: 'workflows', key: 'id' },
          },
          service_name: Sequelize.STRING,
          data: Sequelize.JSON,
          type: {
            allowNull: false,
            type: Sequelize.ENUM,
            values: ['error', 'warning'],
            defaultValue: 'error',
          },
        },
        {
          tableName: 'workflow_errors',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      WorkflowErrorModel.singleton = this;
    }

    return WorkflowErrorModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<WorkflowErrorEntity[]>}
   */
  async getAll() {
    let workflowErrors = await this.model.findAll();

    workflowErrors = workflowErrors.map((item) => {
      return this.prepareEntity(item);
    });

    return workflowErrors;
  }

  /**
   * Create.
   * @param {string} serviceName Service name.
   * @param {object} data Data object.
   */
  async create(serviceName, data) {
    await this.model.create({
      workflow_id: data.queueMessage && data.queueMessage.workflowId,
      service_name: serviceName,
      data,
    });
  }

  /**
   * Find by ID.
   * @param {number} id ID.
   * @returns {Promise<WorkflowErrorEntity>}
   */
  async findById(id) {
    const workflowError = await this.model.findByPk(id);

    if (!workflowError) {
      return;
    }

    return this.prepareEntity(workflowError);
  }

  /**
   * Get by workflow ID.
   * @param {string} workflowId Workflow ID.
   * @param {Array} serviceTypeList Service type list.
   * @returns {Promise<WorkflowErrorEntity[]>} Workflow errors list promise.
   */
  async getByWorkflowId(workflowId, serviceTypeList = ['task', 'event', 'gateway', 'manager']) {
    // DB request.
    const workflowErrorsRaw = await this.model.findAll({
      where: { workflow_id: workflowId, service_name: { [Sequelize.Op.in]: serviceTypeList } },
      order: [['created_at', 'desc']],
    });
    if (!workflowErrorsRaw) {
      return [];
    }

    // Define and return workflow errors.
    const workflowErrors = workflowErrorsRaw.map(this.prepareEntity);
    return workflowErrors;
  }

  /**
   * Delete by ID.
   * @param {number} id ID.
   * @returns {Promise<number}
   */
  async deleteById(id) {
    return await this.model.destroy({
      where: { id },
    });
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowErrorEntity}
   */
  prepareEntity(item) {
    return new WorkflowErrorEntity({
      id: item.id,
      workflowId: item.workflow_id,
      serviceName: item.service_name,
      data: item.data,
      type: item.type,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }
}

module.exports = WorkflowErrorModel;
