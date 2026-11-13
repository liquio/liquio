import { Entity } from './entity';

interface TaskEntityOptions {
  /** ID. */
  id: string;
  /** Workflow ID. */
  workflowId: string;
  /** Workflow. */
  workflow: string;
  /** Name. */
  name: string;
  /** Description. */
  description: string;
  /** Task template ID. */
  taskTemplateId: number;
  /** Document ID. */
  documentId: string;
  /** Document Entity. */
  document: object;
  /** Signer user IDs. */
  signerUsers: string[];
  /** Performer user IDs. */
  performerUsers: string[];
  /** Performer usernames. */
  performerUserNames: string[];
  /** Performer unit IDs. */
  performerUnits: string[];
  /** Required performer unit IDs. */
  requiredPerformerUnits: string[];
  /** Tag IDs. */
  tags: number[];
  /** Data object. */
  data: object;
  /** Cancellation type ID. */
  cancellationTypeId: number;
  /** Finished. */
  finished: boolean;
  /** Finished at. */
  finishedAt: Date;
  /** Deleted. */
  deleted: boolean;
  /** Is entiry task. */
  isEntry: boolean;
  /** Created by. */
  createdBy: string;
  /** Updated by. */
  updatedBy: string;
  /** Due date. */
  dueDate: Date;
  /** Copy from. Original task ID. */
  copyFrom: string;
  /** Is current. */
  isCurrent: boolean;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
  /** Metadata. */
  meta?: object;
  /** Observer units. */
  observerUnits?: number[];
  /** Activity log. */
  activityLog?: object[];
}

interface TaskEntityAdditionalProperties {
  /** Is me signer. */
  isMeSigner?: boolean;
  /** Is me performer. */
  isMePerformer?: boolean;
}

/**
 * Task entity.
 * @typedef {import('./document')} DocumentEntity
 */
export class TaskEntity extends Entity<TaskEntityOptions, TaskEntityAdditionalProperties> {
  getFilterProperties(): (keyof TaskEntityOptions | keyof TaskEntityAdditionalProperties)[] {
    return [
      'id',
      'workflowId',
      'workflow',
      'name',
      'description',
      'taskTemplateId',
      'documentId',
      'document',
      'signerUsers',
      'performerUsers',
      'performerUserNames',
      'performerUnits',
      'requiredPerformerUnits',
      'tags',
      'data',
      'cancellationTypeId',
      'finished',
      'finishedAt',
      'deleted',
      'isEntry',
      'createdBy',
      'updatedBy',
      'dueDate',
      'copyFrom',
      'isCurrent',
      'createdAt',
      'updatedAt',
      'isMeSigner',
      'isMePerformer',
      'meta',
      'observerUnits',
      'activityLog',
    ];
  }

  getFilterPropertiesBrief(): (keyof TaskEntityOptions | keyof TaskEntityAdditionalProperties)[] {
    return this.getFilterProperties();
  }

  /**
   * Set is me signer.
   * @param {string} userId User ID.
   * @returns {TaskEntity} Task entity with define property `isMeSigner`.
   */
  setIsMeSigner(userId: string) {
    this.isMeSigner = this.isSigner(userId);
  }

  /**
   * Set is me signer.
   * @param {string} userId User ID.
   * @param {string[]} userUnitIds User unit IDs list.
   * @returns {TaskEntity} Task entity with define property `isMePerformer`.
   */
  setIsMePerformer(userId: string, userUnitIds: string[] = []) {
    this.isMePerformer = this.isPerformer(userId, userUnitIds);
  }

  /**
   * Set is me signer and performer.
   * @param {string} userId User ID.
   * @param {string[]} userUnitIds User unit IDs list.
   * @returns {TaskEntity} Task entity with define properties `isMeSigner` and `isMePerformer`.
   */
  setIsMeSignerAndPerformer(userId: string, userUnitIds: string[] = []) {
    this.setIsMeSigner(userId);
    this.setIsMePerformer(userId, userUnitIds);
  }

  /**
   * Is signer.
   * @param {string} userId User ID.
   * @returns {boolean} Is signer indicator.
   */
  isSigner(userId: string) {
    // Check if signers not defined.
    if (!this.signerUsers || this.signerUsers.length === 0) {
      return;
    }

    // Define and return is signer indicator.
    const isSigner = this.signerUsers.includes(userId);
    return isSigner;
  }

  /**
   * Is performer directly.
   * @param {string} userId User ID.
   * @returns {boolean} Is performer indicator.
   */
  isPerformerDirectly(userId) {
    const isPerformerDirectly = (this.performerUsers || []).includes(userId);
    return isPerformerDirectly;
  }

  /**
   * Is performer via unit.
   * @param {string[]} userUnitIds User unit IDs list.
   * @returns {boolean} Is performer indicator.
   */
  isPerformerViaUnit(userUnitIds = []) {
    const isPerformerViaUnit = (this.performerUnits || []).some((v) => userUnitIds.includes(v));
    return isPerformerViaUnit;
  }

  /**
   * Is performer.
   * @param {string} userId User ID.
   * @param {string[]} userUnitIds User unit IDs list.
   */
  isPerformer(userId, userUnitIds = []) {
    const isPerformerDirectly = this.isPerformerDirectly(userId);
    const isPerformerViaUnit = this.isPerformerViaUnit(userUnitIds);
    const isPerformer = isPerformerDirectly || isPerformerViaUnit;
    return isPerformer;
  }

  /**
   * Has access.
   * @param {string} userId User ID.
   * @param {number[]} [userUnitIds] User unit IDs.
   * @param {boolean} [strict] Strict indicator. Signers do not have access if equals `true`.
   * @returns {boolean} Has access indicator.
   */
  hasAccess(userId, userUnitIds = [], strict = false) {
    // Check task created by user.
    if (this.createdBy === userId) {
      return true;
    }

    // Check signer users.
    if (strict === false && this.isSigner(userId)) {
      return true;
    }

    // Check performer users and units.
    if (this.isPerformer(userId, userUnitIds)) {
      return true;
    }

    // Return false in other cases.
    return false;
  }
}

export interface TaskEntity extends TaskEntityOptions, TaskEntityAdditionalProperties {}
