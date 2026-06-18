import { Entity } from './entity';

interface WorkflowEntityOptions {
  /** ID. */
  id: string;
  /** Workflow template ID. */
  workflowTemplateId: number;
  /** Name. */
  name: string;
  /** Status. */
  isFinal: boolean;
  /** Cancellation type ID. */
  cancellationTypeId: number;
  /** Created by. */
  createdBy: string;
  /** Updated by. */
  updatedBy: string;
  /** Data. */
  data: object;
  /** Due date. */
  dueDate: Date;
  /** Workflow status ID. */
  workflowStatusId: number;
  /** Number. */
  number: number;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
  /** User data. */
  userData?: object;
  /** Has unresolved errors. */
  hasUnresolvedErrors?: boolean;
  statuses?: object[];
}

interface WorkflowEntityAdditionalOptions {
  workflowTemplate?: object;
  timeline?: object[];
  info?: object;
  files?: object[];
  lastStepLabel?: string;
  lastStepDescription?: string;
  entryTask?: object;
  entryTaskId?: string;
  entryTaskFinishedAt?: Date;
  signatureRemovalHistory?: object[];
}

/**
 * Workflow entity.
 */
export class WorkflowEntity extends Entity<WorkflowEntityOptions, WorkflowEntityAdditionalOptions> {

  getFilterProperties(): (keyof WorkflowEntityOptions | keyof WorkflowEntityAdditionalOptions)[] {
    return [
      'id',
      'workflowTemplateId',
      'workflowTemplate',
      'name',
      'isFinal',
      'createdBy',
      'updatedBy',
      'createdAt',
      'timeline',
      'info',
      'files',
      'dueDate',
      'lastStepLabel',
      'lastStepDescription',
      'entryTaskId',
      'entryTaskFinishedAt',
      'workflowStatusId',
      'number',
      'userData',
      'hasUnresolvedErrors',
      'signatureRemovalHistory',
    ];
  }

  getFilterPropertiesBrief(): (keyof WorkflowEntityOptions | keyof WorkflowEntityAdditionalOptions)[] {
    return [
      'id',
      'workflowTemplateId',
      'workflowTemplate',
      'name',
      'isFinal',
      'createdBy',
      'updatedBy',
      'createdAt',
      'lastStepLabel',
      'lastStepDescription',
      'entryTask',
      'entryTaskId',
      'entryTaskFinishedAt',
      'dueDate',
      'workflowStatusId',
      'number',
      'userData',
    ];
  }

  /**
   * Has access.
   * @param {string} userId User ID.
   * @returns {boolean}
   */
  hasAccess(userId: string): boolean {
    if (this.createdBy === userId) {
      return true;
    }

    return false;
  }
}

export interface WorkflowEntity extends WorkflowEntityOptions {};
