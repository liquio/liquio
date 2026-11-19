import Sequelize from 'sequelize';

import { Model } from './model';
import { WorkflowErrorEntity } from '../entities/workflow_error';
import { getLog } from '../lib/context';

// Constants.
const SUPPRESSED_ERRORS = ['NotFoundError: Task not found.'];

/**
 * Workflow error model.
 */
export class WorkflowErrorModel extends Model {
  private static singleton: WorkflowErrorModel;

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

      this.model.prototype.prepareEntity = this.prepareEntity;

      WorkflowErrorModel.singleton = this;
    }

    return WorkflowErrorModel.singleton;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {string} type Type.
   * @param {object} [options] Options. workflowId - trusted workflow ID (null stores an unlinked row).
   * @returns {Promise<number|undefined>} Created row id, or undefined when the row is skipped.
   */
  async create(data, type = 'error', options: { workflowId?: string | null } = {}) {
    const hasTrustedWorkflowId = typeof options?.workflowId !== 'undefined';

    // If workflowId is not set, then we don't save the error.
    const workflowId = hasTrustedWorkflowId ? options.workflowId : data?.queueMessage?.workflowId || data?.traceMeta?.workflowId;
    if (!hasTrustedWorkflowId && !workflowId) {
      return;
    }

    // If error is suppressed, then we don't save the error.
    const error = `${data?.error}`;
    if (SUPPRESSED_ERRORS.includes(error)) {
      return;
    }

    // Save to DB. Recording is best-effort and must never reject.
    try {
      const row = await this.model.create({
        workflow_id: workflowId ?? null,
        service_name: 'task',
        data,
        type,
      });

      return row.id;
    } catch (error) {
      getLog().save('workflow-error-save-failed', { workflowId, type, message: error?.message }, 'error');
    }
  }

  /**
   * Delete by workflow ID.
   * @param {string} id ID.
   * @returns {Promise<number} Deleted records count promise.
   */
  async deleteByWorkflowId(workflowId) {
    await this.model.destroy({ where: { workflow_id: workflowId } });
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
