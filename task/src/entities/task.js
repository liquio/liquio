const Entity = require('./entity');

/**
 * Task entity.
 * @typedef {import('./document')} DocumentEntity
 */
class TaskEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Task object.
   * @param {string} options.id ID.
   * @param {string} options.workflowId Workflow ID.
   * @param {string} options.workflow Workflow.
   * @param {string} options.name Name.
   * @param {string} options.description Description.
   * @param {number} options.taskTemplateId Task template ID.
   * @param {string} options.documentId Document ID.
   * @param {DocumentEntity} options.document Document Entity.
   * @param {string[]} options.signerUsers Signer user IDs.
   * @param {string[]} options.signerUserNames Signer user names.
   * @param {string[]} options.performerUsers Performer user IDs.
   * @param {string[]} options.performerUsersIpn Performer users IPN.
   * @param {string[]} options.performerUsersEmail Performer user emails.
   * @param {string[]} options.performerUserNames Performer usernames.
   * @param {string[]} options.performerUnits Performer unit IDs.
   * @param {string[]} options.requiredPerformerUnits Required performer unit IDs.
   * @param {number[]} options.tags Tag IDs.
   * @param {object} options.data Data object.
   * @param {number} options.cancellationTypeId Cancellation type ID.
   * @param {boolean} options.finished Finished.
   * @param {Date} options.finishedAt Finished at.
   * @param {boolean} options.deleted Deleted.
   * @param {boolean} options.isEntry Is entiry task.
   * @param {string} options.createdBy Created by.
   * @param {string} options.updatedBy Updated by.
   * @param {Date} options.dueDate Due date.
   * @param {string} options.copyFrom Copy from. Original task ID.
   * @param {boolean} options.isCurrent Is current.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   * @param {object} options.meta Metadata.
   * @param {boolean} options.onlyForHeads Only for heads indicator.
   * @param {number[]} options.observerUnits Observer units.
   * @param {string[]} options.labels Labels.
   * @param {string} options.version Version.
   * @param {TaskActivity} options.activityLog Activity log.
   * @param {Date} options.draftExpiredAt Draft expired at.
   */
  constructor({
    id,
    workflowId,
    workflow,
    name,
    description,
    taskTemplateId,
    documentId,
    taskTemplate,
    document,
    signerUsers,
    signerUserNames,
    performerUsers,
    performerUsersIpn,
    performerUsersEmail,
    performerUserNames,
    performerUnits,
    requiredPerformerUnits,
    tags,
    data,
    cancellationTypeId,
    finished,
    finishedAt,
    deleted,
    isEntry,
    createdBy,
    updatedBy,
    dueDate,
    copyFrom,
    isCurrent,
    createdAt,
    updatedAt,
    meta,
    onlyForHeads,
    observerUnits,
    isSystem,
    labels,
    version,
    activityLog,
    draftExpiredAt,
  }) {
    super();

    this.id = id;
    this.workflowId = workflowId;
    this.workflow = workflow;
    this.name = name;
    this.description = description;
    this.taskTemplateId = taskTemplateId;
    this.documentId = documentId;
    this.document = document;
    this.taskTemplate = taskTemplate;
    this.signerUsers = signerUsers;
    this.signerUserNames = signerUserNames;
    this.performerUsers = performerUsers;
    this.performerUsersIpn = performerUsersIpn;
    this.performerUsersEmail = performerUsersEmail;
    this.performerUserNames = performerUserNames;
    this.performerUnits = performerUnits;
    this.requiredPerformerUnits = requiredPerformerUnits;
    this.tags = tags;
    this.data = data;
    this.cancellationTypeId = cancellationTypeId;
    this.finished = finished;
    this.finishedAt = finishedAt;
    this.deleted = deleted;
    this.isEntry = isEntry;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.dueDate = dueDate;
    this.copyFrom = copyFrom;
    this.isCurrent = isCurrent;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.meta = meta;
    this.onlyForHeads = onlyForHeads;
    this.observerUnits = observerUnits;
    this.isSystem = isSystem;
    this.labels = labels;
    this.version = version;
    this.activityLog = activityLog;
    this.draftExpiredAt = draftExpiredAt;

    // Normalize meta.
    this.normalizeMeta();
  }

  /**
   * Normalize meta.
   */
  normalizeMeta() {
    // Define `isRead` default param if not defined.
    if (typeof this.meta === 'object' && this.meta !== null && typeof this.meta.isRead === 'undefined') {
      this.meta.isRead = false;
    }
  }

  getFilterProperties() {
    return [
      'id',
      'workflowId',
      'workflow.number',
      'workflow.userData',
      'name',
      'description',
      'taskTemplateId',
      'documentId',
      'document',
      'signerUsers',
      'signerUserNames',
      'performerUsers',
      'performerUsersIpn',
      'performerUsersEmail',
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
      'onlyForHeads',
      'isSystem',
      'labels',
      'version',
      'observerUnits',
      'lastStepLabel',
      'lastStepDescription',
      'minSignaturesLimitInfo',
      'deprecated',
      'activityLog',
      'draftExpiredAt',
    ];
  }

  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }

  /**
   * Set is me signer.
   * @param {string} userId User ID.
   * @returns {TaskEntity} Task entity with define property `isMeSigner`.
   */
  setIsMeSigner(userId) {
    this.isMeSigner = this.isSigner(userId);
  }

  /**
   * Set is me signer.
   * @param {string} userId User ID.
   * @param {string[]} userUnitIds User unit IDs list.
   * @returns {TaskEntity} Task entity with define property `isMePerformer`.
   */
  setIsMePerformer(userId, userUnitIds = []) {
    this.isMePerformer = this.isPerformer(userId, userUnitIds);
  }

  /**
   * Set is me signer and performer.
   * @param {string} userId User ID.
   * @param {string[]} userUnitIds User unit IDs list.
   * @returns {TaskEntity} Task entity with define properties `isMeSigner` and `isMePerformer`.
   */
  setIsMeSignerAndPerformer(userId, userUnitIds = []) {
    this.setIsMeSigner(userId);
    this.setIsMePerformer(userId, userUnitIds);
  }

  /**
   * Is signer.
   * @param {string} userId User ID.
   * @returns {boolean} Is signer indicator.
   */
  isSigner(userId) {
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
   * Is required performer via unit.
   * @param {string[]} userUnitIds User unit IDs list.
   * @returns {boolean} Is performer indicator.
   */
  isRequiredPerformerViaUnit(userUnitIds = []) {
    const isPerformerViaUnit = (this.requiredPerformerUnits || []).some((v) => userUnitIds.includes(v));
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
   * Is observer units.
   * @param {number[]} units Users.
   * @returns {boolean} Is performer indicator.
   */
  isObserverUnits(units) {
    return (this.observerUnits || []).some((v) => units.includes(v));
  }

  /**
   * Has access.
   * @param {string} userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} [userUnitIds] User unit IDs.
   * @param {boolean} [strict] Strict indicator. Signers do not have access if equals `true`.
   * @returns {boolean} Has access indicator.
   */
  async hasAccess(userId, userUnitIds = { all: [], head: [], member: [] }, strict = false) {
    // Check extended access check.
    if (this.taskTemplate?.jsonSchema?.extendedAccessCheck) {
      const disableAccessByExtendedCheck = !(await businesses.task.extendedAccessCheck(
        this.taskTemplate.jsonSchema.extendedAccessCheck,
        this.document,
        userId,
      ));
      if (disableAccessByExtendedCheck) {
        return false;
      }
    }

    // Check task created by user.
    if (this.createdBy === userId) {
      return true;
    }

    // Check signer users.
    if (strict === false && this.isSigner(userId)) {
      return true;
    }

    // Check observer units.
    if (strict === false && this.isObserverUnits(userUnitIds.all)) {
      return true;
    }

    // Check performer users and units.
    if (this.isPerformer(userId, userUnitIds.all)) {
      return true;
    }

    // Return false in other cases.
    return false;
  }
}

module.exports = TaskEntity;
