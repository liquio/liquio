import Sequelize from 'sequelize';

import { Model } from './model';
import { WorkflowStatusEntity } from '../entities/workflow_status';

export class WorkflowStatusModel extends Model {
  static singleton: WorkflowStatusModel;

  constructor(dbInstance) {
    if (!WorkflowStatusModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'workflowStatus',
        {
          name: Sequelize.STRING,
        },
        {
          tableName: 'workflow_statuses',
          underscored: true,
        },
      );

      (this.model as any).prepareEntity = this.prepareEntity;

      WorkflowStatusModel.singleton = this;
    }

    return WorkflowStatusModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<WorkflowStatusEntity[]>}
   */
  async getAll() {
    let workflowStatuses: any = await this.model.findAll();

    workflowStatuses = workflowStatuses.map((item) => {
      return this.prepareEntity(item);
    });

    return workflowStatuses;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowStatusEntity}
   */
  prepareEntity(item) {
    return new WorkflowStatusEntity({
      id: item.id,
      name: item.name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }
}
