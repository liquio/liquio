import Sequelize from 'sequelize';

import { Model } from './model';

export class WorkflowErrorModel extends Model {
  static singleton: WorkflowErrorModel;
  model: any;

  constructor() {
    if (!WorkflowErrorModel.singleton) {
      super();

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

      WorkflowErrorModel.singleton = this;
    }

    return WorkflowErrorModel.singleton;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {object} [options] Options.
   * @param {string|null} [options.workflowId] Workflow ID to link; when present (even null), nothing is derived from the message.
   * @returns {Promise<number>} Created row ID.
   */
  async create(data: any, options: { workflowId?: string | null } = {}): Promise<number> {
    const workflowId = 'workflowId' in options ? options.workflowId : data.queueMessage && data.queueMessage.workflowId;
    return (await this.model.create({ workflow_id: workflowId, service_name: 'gateway', data })).id;
  }
}
