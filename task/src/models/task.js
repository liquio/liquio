const Sequelize = require('sequelize');
const SqlString = require('sequelize/lib/sql-string');
const _ = require('lodash');
const moment = require('moment');

const Model = require('./model');
const TaskEntity = require('../entities/task');
const RedisClient = require('../lib/redis_client');
const { SequelizeDbError } = require('../lib/errors');

// Constants.
const GET_ALL_BY_USER_ID_CACHE_TTL = 600; // 10 minutes.

/**
 * Task Model.
 * @typedef {import('../entities/document')} DocumentEntity
 */
class TaskModel extends Model {
  constructor() {
    if (!TaskModel.singleton) {
      super();

      this.model = this.db.define(
        'task',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          workflow_id: {
            type: Sequelize.UUID,
            references: { model: 'workflows', key: 'id' },
          },
          name: Sequelize.STRING,
          description: Sequelize.STRING,
          task_template_id: {
            type: Sequelize.INTEGER,
            references: { model: 'task_templates', key: 'id' },
          },
          document_id: {
            type: Sequelize.UUID,
            references: { model: 'documents', key: 'id' },
          },
          signer_users: Sequelize.ARRAY(Sequelize.STRING),
          signer_usernames: Sequelize.ARRAY(Sequelize.STRING),
          performer_users: Sequelize.ARRAY(Sequelize.STRING),
          performer_users_ipn: Sequelize.ARRAY(Sequelize.STRING),
          performer_users_email: Sequelize.ARRAY(Sequelize.STRING),
          performer_usernames: Sequelize.ARRAY(Sequelize.STRING),
          performer_units: Sequelize.ARRAY(Sequelize.INTEGER),
          required_performer_units: Sequelize.ARRAY(Sequelize.INTEGER),
          tags: Sequelize.ARRAY(Sequelize.INTEGER),
          data: Sequelize.JSON,
          finished: Sequelize.BOOLEAN,
          finished_at: Sequelize.DATE,
          deleted: Sequelize.BOOLEAN,
          is_entry: Sequelize.BOOLEAN,
          cancellation_type_id: Sequelize.INTEGER,
          created_by: Sequelize.STRING,
          updated_by: Sequelize.STRING,
          due_date: Sequelize.DATE,
          copy_from: Sequelize.UUID,
          is_current: Sequelize.BOOLEAN,
          meta: Sequelize.JSON,
          only_for_heads: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          observer_units: Sequelize.ARRAY(Sequelize.INTEGER),
          is_system: Sequelize.BOOLEAN,
          labels: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: false,
            defaultValue: [],
          },
          version: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          activity_log: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: [],
          },
          draft_expired_at: Sequelize.DATE,
        },
        {
          tableName: 'tasks',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.paginate = this.paginate;

      this.model.prototype.prepareEntity = this.prepareEntity;

      TaskModel.singleton = this;
    }

    return TaskModel.singleton;
  }

  /**
   * Get all by User ID.
   * @param {string} userId User ID.
   * @param {number[]} userUnitIds User unit IDs.
   * @param {number[]} userHeadUnitIds User head unit IDs.
   * @param {object} options Options.
   * @returns {Promise<{data: TaskEntity[]}>} Model response with task entities list promise.
   */
  async getAllByUserId(
    userId,
    userUnitIds,
    userHeadUnitIds,
    { currentPage, perPage, filters, sort, onboardingTaskTemplateIds, fromCreatedAt, toCreatedAt },
  ) {
    // Hide system tasks.
    filters.is_system = false;

    const sequelizeOptions = this.formOptionsToGetAllByUserId(
      userId,
      userUnitIds,
      userHeadUnitIds,
      currentPage,
      perPage,
      filters,
      sort,
      onboardingTaskTemplateIds,
      fromCreatedAt,
      toCreatedAt,
    );

    const cacheKey = RedisClient.createKey('tasks', 'getAllByUserId', userId, {
      userUnitIds,
      userHeadUnitIds,
      currentPage,
      perPage,
      filters,
      sort,
      onboardingTaskTemplateIds,
      fromCreatedAt,
      toCreatedAt,
    });

    let { data: tasks } = await RedisClient.getOrSetWithTimestamp(
      cacheKey,
      () => this.getTasksTimestampByUserId(userId, GET_ALL_BY_USER_ID_CACHE_TTL), // Check if there's something new.
      () => this.model.paginate(sequelizeOptions),
      GET_ALL_BY_USER_ID_CACHE_TTL,
    );

    tasks.data = tasks.data.map((item) => this.prepareEntity(item));

    return tasks;
  }

  /**
   * Get last user draft.
   * @param {string} userId User ID.
   * @param {number} taskTemplateId Task template ID.
   * @returns {Promise<TaskEntity|null>} Task entity promise.
   */
  async getLastUserDraft(userId, taskTemplateId) {
    // DB query.
    const options = {
      where: {
        task_template_id: taskTemplateId,
        performer_users: { [Sequelize.Op.overlap]: [userId] },
        finished: false,
        deleted: false,
        is_entry: true,
      },
      order: [['created_at', 'desc']],
      attributes: ['id', 'document_id', 'performer_users', 'meta'],
      limit: 1,
    };
    const tasks = await this.model.findAll(options);

    // Handle result.
    const [taskEntity] = tasks.map(this.prepareEntity);
    return taskEntity;
  }

  /**
   * Get all by workflow ID.
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<TaskEntity[]>}
   */
  async getAllByWorkflowId(workflowId) {
    let tasks = await this.model.findAll({
      include: [{ model: models.document.model }],
      where: { workflow_id: workflowId, is_current: true },
    });

    tasks = tasks.map(async (item) => {
      let task = this.prepareEntity(item);
      if (item.document) {
        task.document = await item.document.prepareEntity(item.document);
      }
      return task;
    });

    return tasks;
  }

  /**
   * Get last tasks by current task ID.
   * @param {string} currentTaskId Current task ID.
   * @returns {Promise<TaskEntity[]>}
   */
  async getLastByCurrentTaskId(currentTaskId) {
    // Check current task.
    const currentTask = await this.findById(currentTaskId);
    const { workflowId, createdAt: currentTaskCreatedAt } = currentTask;

    // Get last tasks after current.
    const tasksRaw = await this.model.findAll({
      where: {
        workflow_id: workflowId,
        is_current: true,
        finished: false,
        created_at: { [Sequelize.Op.gt]: currentTaskCreatedAt },
      },
      order: [['created_at', 'desc']],
    });

    const tasks = tasksRaw.map(this.prepareEntity);

    return tasks;
  }

  /**
   * Find by ID.
   * @param {string} id
   * @returns {Promise<TaskEntity>}
   */
  async findById(id, { withWorkflow = false, withWorkflowTemplate = false } = {}) {
    const include = [{ model: global.models.document.model }, { model: global.models.taskTemplate.model }];

    if (withWorkflow) {
      include.push({
        model: global.models.workflow.model,
        attributes: Array.isArray(withWorkflow) ? withWorkflow : undefined,
        include: withWorkflowTemplate
          ? [
            {
              model: global.models.workflowTemplate.model,
              attributes: Array.isArray(withWorkflowTemplate) ? withWorkflowTemplate : undefined,
            },
          ]
          : [],
      });
    }

    const task = await this.model.findByPk(id, { include });

    if (!task) {
      return;
    }

    let taskEntity = this.prepareEntity(task);

    if (task.document) {
      taskEntity.document = await global.models.document.prepareEntity(task.document);
    }

    if (task.workflow) {
      taskEntity.workflow = global.models.workflow.prepareEntity(task.workflow);
      if (task.workflow.workflowTemplate) {
        taskEntity.workflow.workflowTemplate = global.models.workflowTemplate.prepareEntity(task.workflow.workflowTemplate);
      }
    }

    return taskEntity;
  }

  /**
   * Find by document ID.
   * @param {string} documentId
   * @returns {Promise<TaskEntity>}
   */
  async findByDocumentId(documentId) {
    const task = await this.model.findOne({ where: { document_id: documentId } });

    return this.prepareEntity(task);
  }

  /**
   * Find task by document ID with workflow.
   * @param {string} documentId Document ID.
   * @returns {Promise<TaskEntity>}
   */
  async findByDocumentIdWithWorkflow(documentId) {
    const task = await this.model.findOne({
      where: { document_id: documentId },
      include: [{ model: global.models.workflow.model }],
    });

    if (task.workflow) {
      task.workflow = global.models.workflow.prepareEntity(task.workflow);
    }

    return this.prepareEntity(task);
  }

  /**
   * Check draft expiration by document ID.
   * @note Similar to businesses.task.checkDraftExpired, but fetches task.
   * @param {string} documentId Document ID.
   * @returns {Promise<boolean>} Draft expiration flag promise.
   */
  async checkDraftExpirationByDocumentId(documentId) {
    const task = await this.model.findOne({ where: { document_id: documentId }, attributes: ['id', 'draft_expired_at'] });

    return task.draft_expired_at ? task.draft_expired_at <= Date.now() : false;
  }

  /**
   * Get documents by workflow ID.
   * @param {string} workflowId Workflow ID.
   * @param {boolean} isCurrentOnly Is get only current tasks.
   * @param {boolean} isAppendPerformerUsers Is append performer users to document entity.
   * @returns {Promise<DocumentEntity[]>}
   */
  async getDocumentsByWorkflowId(workflowId, isCurrentOnly = true, isAppendPerformerUsers = false) {
    // Define common params.
    const options = {
      include: [{ model: models.document.model }],
      where: { workflow_id: workflowId },
    };

    // Check the need to get not only current tasks of the process.
    if (isCurrentOnly === true) options.where.is_current = true;

    // Get.
    const tasks = await this.model.findAll(options);

    // Get document entities.
    let documents = [];
    if (tasks) {
      for (const task of tasks) {
        if (task.document) {
          let document;
          if (isAppendPerformerUsers) {
            document = {
              ...(await task.document.prepareEntity(task.document)),
              performerUsers: task.performer_users,
              performerUserNames: task.performer_usernames,
            };
          } else {
            document = await task.document.prepareEntity(task.document);
          }

          // Custom field for query optimization.
          if (!isCurrentOnly) {
            document.isTaskCurrent = task.is_current;
          }

          documents.push(document);
        }
      }
    }

    // Return documents entities.
    return documents;
  }

  /**
   * Find previous status document.
   * @param {string} workflowId Workflow ID.
   * @param {number} taskTemplateId Task template ID.
   * @param {string} typeService.
   * @returns {Promise<{task: TaskEntity, document: DocumentEntity}>} Task and document entities promise.
   */
  async findPreviousStatusDocument(workflowId, taskTemplateId, typeService) {
    // Find task.
    const task = await this.model.findOne({
      include: [
        {
          model: models.document.model,
          where: {
            data: {
              result: {
                typeService: typeService,
              },
            },
          },
        },
      ],
      where: {
        workflow_id: workflowId,
        task_template_id: taskTemplateId,
      },
      order: [[models.document.model, 'created_at', 'desc']],
    });

    // Check.
    if (!task) {
      return;
    }

    // Define and return document entities.
    return await task.document.prepareEntity(task.document);
  }

  /**
   * Find document by workflow ID and task template ID.
   * @param {string} workflowId Workflow ID.
   * @param {string} taskTemplateId Task template ID.
   * @param {boolean} finished Finished flag.
   * @returns {Promise<{task: TaskEntity, document: DocumentEntity}>} Task and document entities promise.
   */
  async findDocumentByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId, finished) {
    // Find task.
    const options = {
      include: [{ model: models.document.model }],
      where: {
        workflow_id: workflowId,
        task_template_id: taskTemplateId,
        is_current: true,
      },
    };

    if (typeof finished === 'boolean') {
      options.where.finished = finished;
    }

    const task = await this.model.findOne(options);

    // Check.
    if (!task) {
      return;
    }

    // Define and return task and document entities.
    const taskEntity = this.prepareEntity(task);
    const documentEntity = await task.document.prepareEntity(task.document);
    return { task: taskEntity, document: documentEntity };
  }

  /**
   * Find document by workflow ID and task template IDs.
   * @param {string} workflowId Workflow ID.
   * @param {string} taskTemplateIds Task template ID.
   * @returns {Promise<{task: TaskEntity, document: DocumentEntity}>} Task and document entities promise.
   */
  async findDocumentByWorkflowIdAndTaskTemplateIds(workflowId, taskTemplateIds) {
    // Check.
    if (!Array.isArray(taskTemplateIds) || taskTemplateIds.length === 0) {
      throw new Error('Task template IDs list should be defined and not empty.');
    }

    // Find task.
    const task = await this.model.findOne({
      include: [{ model: models.document.model }],
      where: { workflow_id: workflowId, task_template_id: taskTemplateIds, is_current: true },
      order: [['created_at', 'DESC']],
    });

    // Check.
    if (!task) {
      return;
    }

    // Define and return task and document entities.
    const taskEntity = this.prepareEntity(task);
    const documentEntity = await task.document.prepareEntity(task.document);
    return { task: taskEntity, document: documentEntity };
  }

  /**
   * Find document ID by workflow ID and document template ID.
   * @param {string} workflowId Workflow ID.
   * @param {string} taskTemplateId Task template ID.
   * @returns {Promise<{string}>} Document ID promise.
   */
  async findDocumentIdByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId) {
    // Find all task.
    const task = await this.model.findOne({
      include: [{ model: models.document.model }],
      where: { workflow_id: workflowId, task_template_id: taskTemplateId, is_current: true },
      attributes: ['id', 'document_id'],
    });

    // Check.
    if (!task) {
      return;
    }
    const taskEntity = this.prepareEntity(task);

    // Define and return document ID.
    const documentId = taskEntity.documentId;
    return documentId;
  }

  /**
   * Get tasks by performer user.
   * @param {string} userId Performer user.
   * @param {object} queryOptions Query options.
   * @param {number[]} queryOptions.taskTemplateIds taskTemplateIds.
   * @param {boolean} queryOptions.isFinished isFinished.
   * @param {boolean} queryOptions.isEntry isEntry.
   * @returns {Promise<TaskEntity[]>} Task entity list.
   */
  async getByPerformerUser(userId, queryOptions) {
    const { taskTemplateIds, isFinished, isEntry } = queryOptions;

    const filters = {
      performer_users: { [Sequelize.Op.overlap]: [userId] },
      task_template_id: { [Sequelize.Op.in]: taskTemplateIds.map(Number).filter(Boolean) },
      is_current: true,
      deleted: false,
    };

    if (typeof isFinished === 'boolean') {
      filters['finished'] = isFinished;
    }
    if (typeof isEntry === 'boolean') {
      filters['is_entry'] = isEntry;
    }
    const tasks = await this.model.findAll({ where: filters });
    return tasks.map((task) => this.prepareEntity(task));
  }

  /**
   * Get not finished count by performer user.
   * @param {string} user Performer user.
   * @returns {Promise<number>} Not finished tasks count.
   */
  async getNotFinishedCountByPerformerUser(user) {
    const tasksCount = await this.model.count({
      where: { performer_users: [user], is_current: true, finished: false },
    });

    return tasksCount;
  }

  /**
   * Get tasks by performer unit.
   * @param {string[]} units Performer units.
   * @returns {Promise<TaskEntity[]>}
   */
  async getByPerformerUnit(units) {
    const tasks = await this.model.findAll({ where: { performer_units: units, is_current: true } });

    return tasks.map((item) => {
      return this.prepareEntity(item);
    });
  }

  /**
   * Get tasks by signer user.
   * @param {string[]} users Performer users.
   * @returns {Promise<TaskEntity[]>}
   */
  async getBySignerUser(users) {
    const tasks = await this.model.findAll({ where: { signer_users: users, is_current: true } });

    return tasks.map((item) => {
      return this.prepareEntity(item);
    });
  }

  /**
   * Get by workflow ID.
   * @param {string} workflowId Workflow ID.
   * @param {object} [options] Options.
   * @param {boolean} [options.onlyCurrent] Only current.
   * @param {object} [options.maxCreatedAtTask] Max created at task.
   * @param {object} [options.isDistinct] Use distinct on task template flag.
   * @returns {Promise<{taskId, documentId, taskPerformerUsers, taskPerformerUnits, taskRequiredPerformerUnits, taskObserverUnits}[]>} Promise of tasks info list.
   */
  async getTaskAndDocumentMainInfo(workflowId, { onlyCurrent = true, maxCreatedAtTask, isDistinct = false } = {}) {
    let filters = {};
    let attributes = [];
    let order = [];
    if (onlyCurrent === true) {
      filters.is_current = true;
    }
    if (maxCreatedAtTask) {
      attributes.push(Sequelize.literal('DISTINCT ON (task_template_id) task_template_id'));
      filters.created_at = { [Sequelize.Op.lte]: maxCreatedAtTask };
      order = [['task_template_id'], ['created_at', 'desc']];
    }

    if (isDistinct) {
      attributes.push(Sequelize.literal('DISTINCT ON (task_template_id) task_template_id'));
      order = [['task_template_id'], ['created_at', 'desc']];
    }

    const tasksInfo = await this.model.findAll({
      where: { workflow_id: workflowId, finished: true, ...filters },
      attributes: [...attributes, 'id', 'document_id', 'performer_users', 'performer_units', 'required_performer_units'],
      order,
    });

    return tasksInfo.map((item) => ({
      taskId: item.id,
      documentId: item.document_id,
      taskPerformerUsers: item.performer_users,
      taskPerformerUnits: item.performer_units,
      taskRequiredPerformerUnits: item.required_performer_units,
      taskObserverUnits: item.observer_units,
    }));
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {number} data.taskTemplateId Task template ID.
   * @param {string} data.workflowId Workflow ID.
   * @param {string} data.documentId Document ID.
   * @param {string} data.userId Created by user ID.
   * @param {number[]} [data.performerUnits] Performer units IDs.
   * @param {number[]} [data.requiredPerformerUnits] Required performer units IDs.
   * @param {string[]} [data.performerUsers] Performer users IDs.
   * @param {string[]} [data.performerUserNames] Performer usernames.
   * @param {string[]} [data.signerUsers] Signer users IDs.
   * @param {boolean} [data.onlyForHeads] Only for heasds.
   * @param {string} [data.dueDate] Due date.
   * @param {boolean} [data.isEntry] Is entry.
   * @param {string} [data.copyFrom] Copy from. Original task ID.
   * @param {string} [data.name] Task name.
   * @param {number[]} [data.observerUnits] Observer units.
   * @param {string} data.version Version.
   * @returns {Promise<TaskEntity>} Created task entity promise.
   */
  async create({
    taskTemplateId,
    workflowId,
    documentId,
    userId,
    performerUnits = [],
    requiredPerformerUnits = [],
    performerUsers = [],
    performerUsersIpn = [],
    performerUsersEmail = [],
    performerUserNames = [],
    signerUsers = [],
    onlyForHeads = false,
    dueDate,
    isEntry,
    copyFrom,
    name,
    _createdByUnitHeads = [],
    _createdByUnits = [],
    observerUnits,
    isSystem = false,
    labels = [],
    meta = {},
    version,
  }) {
    // Prepare task record.
    const task = this.prepareForModel({
      taskTemplateId,
      workflowId,
      documentId,
      createdBy: userId,
      updatedBy: userId,
      performerUnits,
      requiredPerformerUnits,
      performerUsers,
      performerUsersIpn,
      performerUsersEmail,
      performerUserNames,
      signerUsers,
      onlyForHeads,
      dueDate,
      isEntry,
      copyFrom,
      name,
      observerUnits,
      isSystem,
      labels,
      meta,
      version,
    });

    // Create and return task.
    const createdTask = await this.model.create(task);

    // Return created task.
    return this.prepareEntity(createdTask);
  }

  /**
   * Update.
   * @param {string} id Task ID.
   * @param {string} userId User ID.
   * @param {object} properties Data users.
   * @returns {Promise<TaskEntity>}
   */
  async update(id, userId, properties) {
    const task = this.prepareForModel({
      ...properties,
      updatedBy: userId,
    });

    let updateResult;
    try {
      updateResult = await this.model.update(task, { where: { id: id }, returning: true });
    } catch (error) {
      throw new SequelizeDbError(error);
    }

    const [, updatedTask] = updateResult;

    if (updatedTask.length === 1) {
      return this.prepareEntity(updatedTask[0]);
    }
  }

  /**
   * Update document ID.
   * @param {string} id Task ID.
   * @param {string} documentId Document ID.
   * @returns {Promise<TaskEntity>}
   */
  async updateDocumentId(id, documentId) {
    const task = this.prepareForModel({ documentId });
    const [, updatedTasks] = await this.model.update(task, { where: { id: id }, returning: true });

    if (updatedTasks.length === 1) {
      return this.prepareEntity(updatedTasks[0]);
    }
  }

  /**
   * Set status finished.
   * @param {string} id Task ID.
   * @param {string[]} [performerUsers] Performer users list.
   * @param {string[]} [performerUserNames] Performer user names list.
   * @param {string} [name] Name.
   * @returns {Promise<TaskEntity>} Updated task entity promise.
   */
  async setStatusFinished(id, performerUsers, performerUserNames, name) {
    // Prepare update object.
    const updateObject = {
      finished: true,
      finished_at: Sequelize.fn('NOW'),
    };
    if (performerUsers) {
      updateObject.performer_users = performerUsers;
    }
    if (performerUserNames) {
      updateObject.performer_usernames = performerUserNames;
    }
    if (name) {
      updateObject.name = name;

      if (name.length > 255) {
        const error = new Error('Task name is too long.');
        error.details = { name };

        throw error;
      }
    }

    // Update.
    const [, [updatedTaskRaw]] = await this.model.update(updateObject, {
      where: { id, finished: false },
      returning: true,
    });

    // Check DB response.
    if (!updatedTaskRaw) {
      throw new Error('Task not found or already finished.');
      // return;
    }

    // Return task entity.
    const taskEntity = await this.findById(id);
    return taskEntity;
  }

  /**
   * Set state deleted.
   * @param {string} id Task ID.
   * @param {boolean} value Value.
   */
  async setStateDeleted(id, value) {
    await this.model.update({ deleted: value }, { where: { id } });
  }

  /**
   * Delete by ID.
   * @param {string} id ID.
   * @returns {Promise<number} Deleted records count promise.
   */
  async deleteById(id) {
    await this.model.destroy({ where: { id } });
  }

  /**
   * Set signer users.
   * @param {string} id Task ID.
   * @param {string[]} signerUsers Signer users list.
   * @param {string[]} [signerUsernames] Signer users names.
   * @returns {Promise<TaskEntity>} Updated task entity promise.
   */
  async setSignerUsers(id, signerUsers, signerUsernames) {
    // Update.
    const [, updatedTasks] = signerUsernames
      ? await this.model.update({ signer_users: signerUsers, signer_usernames: signerUsernames }, { where: { id }, returning: true })
      : await this.model.update({ signer_users: signerUsers }, { where: { id }, returning: true });

    // Check if 1 row updated.
    if (updatedTasks && updatedTasks.length === 1) {
      // Define and return first updated row entity.
      const [updatedTask] = updatedTasks;
      return this.prepareEntity(updatedTask);
    }
  }

  /**
   * Set performer users.
   * @param {string} id Task ID.
   * @param {string[]} performerUsers Performer users list.
   * @param {string[]} performerUserNames Performer user names.
   * @returns {Promise<TaskEntity>} Updated task entity promise.
   */
  async setPerformerUsers(id, performerUsers, performerUserNames) {
    // Update.
    const [, updatedTasks] = await this.model.update(
      { performer_users: performerUsers, performer_usernames: performerUserNames },
      { where: { id }, returning: true },
    );

    // Check if 1 row updated.
    if (updatedTasks && updatedTasks.length === 1) {
      // Define and return first updated row entity.
      const [updatedTask] = updatedTasks;
      return this.prepareEntity(updatedTask);
    }
  }

  /**
   * Add performer user by IPN.
   * @param {string} performerUserIpn Performer user IPN.
   * @param {string} performerUserEmail Performer user email.
   * @param {string} performerUserId Performer user ID.
   * @param {string} performerUserName Performer user name.
   * @returns {Promise} Promise.
   */
  async addPerformerUserByIpnOrEmail(performerUserIpn, peformerUserEmail, performerUserId, performerUserName) {
    // Add user ID and name, but remove IPN and email.
    await this.model.update(
      {
        performer_users: Sequelize.fn('array_append', Sequelize.col('performer_users'), performerUserId),
        performer_usernames: Sequelize.fn('array_append', Sequelize.col('performer_usernames'), performerUserName),
        performer_users_ipn: Sequelize.fn('array_remove', Sequelize.col('performer_users_ipn'), performerUserIpn),
        performer_users_email: Sequelize.fn('array_remove', Sequelize.col('performer_users_email'), peformerUserEmail),
      },
      {
        where: {
          [Sequelize.Op.or]: [
            { performer_users_ipn: { [Sequelize.Op.contains]: [performerUserIpn] } },
            { performer_users_email: { [Sequelize.Op.contains]: [peformerUserEmail] } },
          ],
        },
      },
    );
  }

  /**
   * Find task ID and it's document by workflow ID and task template ID.
   * @param {string} workflowId Workflow ID.
   * @param {number} taskTemplateId Task template ID.
   * @returns {Promise<TaskEntity>}
   */
  async findCurrentTaskByWorkflowIdAndTaskTemplateID(workflowId, taskTemplateId) {
    let task = await this.model.findOne({
      include: [{ model: global.models.document.model }],
      where: { workflow_id: workflowId, task_template_id: taskTemplateId, is_current: true },
      attributes: ['id'],
    });

    if (!task) {
      return;
    }

    let taskEntity = this.prepareEntity(task);
    if (task.document) {
      taskEntity.document = await task.document.prepareEntity(task.document);
    }

    return taskEntity;
  }

  /**
   * Change is_current state to old.
   * @param {number} taskTemplateId Task template ID.
   * @param {string} workflowId Workflow ID.
   */
  async changeIsCurrentStateToOld(taskTemplateId, workflowId) {
    await this.model.update({ is_current: false }, { where: { task_template_id: taskTemplateId, workflow_id: workflowId, is_current: true } });
  }

  /**
   * Set due date.
   * @param {string} id Task ID.
   * @param {string} dueDate Due date.
   * @returns {Promise<TaskEntity>} Updated task entity promise.
   */
  async setDueDate(id, dueDate) {
    // Update.
    const [, updatedTasks] = await this.model.update({ due_date: dueDate }, { where: { id }, returning: true });

    // Check if 1 row updated.
    if (updatedTasks && updatedTasks.length === 1) {
      // Define and return first updated row entity.
      const [updatedTask] = updatedTasks;
      return this.prepareEntity(updatedTask);
    }
  }

  /**
   * Get unread tasks.
   * @param {string} userId User ID.
   * @param {number[]} userUnitIds User unit IDs.
   * @param {number[]} userHeadUnitIds User head unit IDs.
   * @param {object} options Options.
   * @returns {Promise<number>} Unread tasks quantity.
   */
  async getUnreadTasksCount(userId, userUnitIds, userHeadUnitIds, { filters, sort, onboardingTaskTemplateIds }) {
    // Get sequlize options.
    const sequelizeOptions = this.formOptionsToGetAllByUserId(
      userId,
      userUnitIds,
      userHeadUnitIds,
      undefined,
      undefined,
      filters,
      sort,
      onboardingTaskTemplateIds,
    );

    // Count unread tasks.
    const unreadTasks = await this.model.count({
      include: [{ model: models.workflow.model, required: true, attributes: [] }],
      where: {
        ...sequelizeOptions.filters,
        // meta: { isRead: false },
        meta: { isRead: { [Sequelize.Op.not]: true } },
      },
    });

    return unreadTasks;
  }

  /**
   * Find last task ID.
   * @param {string} workflowId Workflow ID.
   * @param {string} taskTemplateId Task template ID.
   * @returns {string} Task ID.
   */
  async findLastTaskId(workflowId, taskTemplateId) {
    // Find task.
    const result = await this.model.findAll({
      limit: 1,
      where: { workflow_id: workflowId, task_template_id: taskTemplateId },
      order: [['created_at', 'DESC']],
    });
    const task = result && result[0];

    // Check.
    if (!task) {
      return;
    }
    const taskId = task && task.id;

    return taskId;
  }

  /**
   * Find last created task with its' document.
   * @param {string} workflowId Workflow ID.
   * @param {number} taskTemplateId Task template ID.
   * @returns {Promise<TaskEntity>}
   */
  async findLastTask(workflowId, taskTemplateId) {
    const result = await this.model.findAll({
      limit: 1,
      where: { workflow_id: workflowId, task_template_id: taskTemplateId },
      order: [['created_at', 'DESC']],
      include: [{ model: global.models.document.model }],
    });
    const task = result && result[0];

    if (!task) {
      return null;
    }

    let taskEntity = this.prepareEntity(task);
    if (task.document) {
      taskEntity.document = await task.document.prepareEntity(task.document);
    }

    return taskEntity;
  }

  /**
   * Form sequelize options to get tasks by user ID.
   * @param {string} userId User ID.
   * @param {number[]} userUnitIds User unit IDs.
   * @param {number[]} userHeadUnitIds User head unit IDs.
   * @param {object} options Options.
   * @returns {object} sequelizeOptions
   */
  formOptionsToGetAllByUserId(
    userId,
    userUnitIds,
    userHeadUnitIds,
    currentPage,
    perPage,
    filters,
    sort,
    onboardingTaskTemplateIds,
    fromCreatedAt,
    toCreatedAt,
  ) {
    let sequelizeOptions = {
      currentPage,
      perPage,
      filters: {
        ..._.pick(filters, ['finished', 'deleted']),
      },
    };

    // If 2024-05-25 is passed, we must search including that date. So we have to add one day.
    let toCreatedAtPrepared = toCreatedAt;
    if (/^\d{4}-\d{2}-\d{2}$/.test(toCreatedAt)) {
      toCreatedAtPrepared = moment(toCreatedAt).add(1, 'day');
    }
    if (fromCreatedAt && toCreatedAt) {
      sequelizeOptions.filters['created_at'] = { [Sequelize.Op.between]: [fromCreatedAt, toCreatedAtPrepared] };
    } else if (fromCreatedAt) {
      sequelizeOptions.filters['created_at'] = { [Sequelize.Op.gte]: fromCreatedAt };
    } else if (toCreatedAt) {
      sequelizeOptions.filters['created_at'] = { [Sequelize.Op.lte]: toCreatedAtPrepared };
    }

    sequelizeOptions.include = [
      {
        model: models.document.model,
        required: true,
        attributes: ['number'],
      },
      {
        model: models.workflow.model,
        required: true,
        attributes: ['number', 'user_data', 'data'],
        include: _.has(filters, 'workflow_name') ? [{ model: models.workflowTemplate.model, attributes: ['name', 'data'] }] : [],
      },
      (_.has(filters, 'search') || _.has(filters, 'name')) && {
        model: models.taskTemplate.model,
        attributes: ['name'],
        required: true,
        include: [{ model: models.documentTemplate.model, attributes: ['name'] }],
      },
    ];

    sequelizeOptions.include = sequelizeOptions.include.filter((v) => !!v);

    if (typeof filters.is_entry === 'boolean') {
      sequelizeOptions.filters[Sequelize.Op.and] = [Sequelize.literal(`task.is_entry = ${!!filters.is_entry}`)];
    } else {
      sequelizeOptions.filters[Sequelize.Op.and] = [Sequelize.literal('task.is_entry = false')];
    }

    if (onboardingTaskTemplateIds) {
      sequelizeOptions.filters.task_template_id = {
        [Sequelize.Op.notIn]: onboardingTaskTemplateIds,
      };
    }

    if (_.has(filters, 'assigned_to')) {
      if (filters['assigned_to'] === 'me') {
        sequelizeOptions.filters[Sequelize.Op.or] = [
          { performer_users: { [Sequelize.Op.overlap]: [userId] } },
          { signer_users: { [Sequelize.Op.overlap]: [userId] } },
        ];
      } else if (filters['assigned_to'] === 'unit') {
        const performerUnitsFiltered = []
          .concat(filters.performer_units)
          .filter(Boolean)
          .map((v) => parseInt(v))
          .filter((v) => userUnitIds.includes(v) || userHeadUnitIds.includes(v));

        sequelizeOptions.filters[Sequelize.Op.and] = [
          {
            [Sequelize.Op.or]: [
              { performer_units: { [Sequelize.Op.overlap]: userUnitIds }, only_for_heads: false },
              { performer_units: { [Sequelize.Op.overlap]: userHeadUnitIds }, only_for_heads: true },
            ],
          },
          {
            [Sequelize.Op.or]: [
              Sequelize.literal('required_performer_units = \'{}\''),
              { required_performer_units: { [Sequelize.Op.contained]: userUnitIds } },
            ],
          },
          performerUnitsFiltered.length && { performer_units: { [Sequelize.Op.overlap]: performerUnitsFiltered } },
        ].filter(Boolean);
      }
    } else {
      sequelizeOptions.filters[Sequelize.Op.and].push({
        [Sequelize.Op.or]: [
          { performer_users: { [Sequelize.Op.overlap]: [userId] } },
          { signer_users: { [Sequelize.Op.overlap]: [userId] } },
          global.config.modules.main && global.config.modules.main.observerUnits ? { observer_units: { [Sequelize.Op.overlap]: userUnitIds } } : null,
          {
            [Sequelize.Op.or]: [
              { performer_units: { [Sequelize.Op.overlap]: userUnitIds }, only_for_heads: false },
              {
                performer_units: { [Sequelize.Op.overlap]: userHeadUnitIds },
                only_for_heads: true,
              },
            ],
          },
        ].filter((v) => v !== null),
      });

      sequelizeOptions.filters[Sequelize.Op.and].push({
        [Sequelize.Op.or]: [
          Sequelize.literal('required_performer_units = \'{}\''),
          { required_performer_units: { [Sequelize.Op.contained]: userUnitIds } },
        ].filter((v) => v !== null),
      });
    }

    if (_.has(filters, 'closed_by')) {
      sequelizeOptions.filters['finished'] = true;
      if (filters['closed_by'] === 'me') {
        sequelizeOptions.filters['updated_by'] = userId;
      } else if (filters['closed_by'] === 'unit' && _.has(filters, 'assigned_to') && filters['assigned_to'] !== 'unit') {
        sequelizeOptions.filters[Sequelize.Op.and].push({
          [Sequelize.Op.or]: [
            { performer_units: { [Sequelize.Op.overlap]: userUnitIds }, only_for_heads: false },
            { performer_units: { [Sequelize.Op.overlap]: userHeadUnitIds }, only_for_heads: true },
            global.config.modules.main && global.config.modules.main.observerUnits
              ? { observer_units: { [Sequelize.Op.overlap]: userUnitIds } }
              : null,
          ].filter((v) => v !== null),
        });
        sequelizeOptions.filters[Sequelize.Op.and].push({
          [Sequelize.Op.or]: [
            Sequelize.literal('required_performer_units = \'{}\''),
            { required_performer_units: { [Sequelize.Op.contained]: userUnitIds } },
          ].filter((v) => v !== null),
        });
      }
    }

    if (_.has(filters, 'search')) {
      sequelizeOptions.filters[Sequelize.Op.and].push({
        [Sequelize.Op.or]: {
          '$document.number$': {
            [Sequelize.Op.iLike]: `%${filters.search}%`,
          },
          '$document.data$': Sequelize.literal(`document.data::text ilike '%${SqlString.escape(filters.search).replace(/'/g, '')}%' `),
          '$taskTemplate->documentTemplate.html_template$': {
            [Sequelize.Op.iLike]: `%${filters.search}%`,
          },
          '$workflow.number$': {
            [Sequelize.Op.iLike]: `%${filters.search}%`,
          },
          '$workflow.user_data$': Sequelize.literal(
            `workflow.user_data ->> 'userName' ilike '%${SqlString.escape(filters.search).replace(/'/g, '')}%' `,
          ),
          name: {
            [Sequelize.Op.iLike]: `%${filters.search}%`,
          },
          '$taskTemplate.name$': {
            [Sequelize.Op.iLike]: `%${filters.search}%`,
          },
          '$taskTemplate->documentTemplate.name$': {
            [Sequelize.Op.iLike]: `%${filters.search}%`,
          },
        },
      });
    }

    if (_.has(filters, 'number')) {
      sequelizeOptions.filters[Sequelize.Op.and].push({
        [Sequelize.Op.or]: {
          '$document.number$': {
            [Sequelize.Op.iLike]: `%${filters.number}%`,
          },
          '$workflow.number$': {
            [Sequelize.Op.iLike]: `%${filters.number}%`,
          },
        },
      });
    }
    if (_.has(filters, 'workflow_name')) {
      sequelizeOptions.filters[Sequelize.Op.and].push({
        [Sequelize.Op.or]: {
          name: {
            [Sequelize.Op.iLike]: `%${filters.workflow_name}%`,
          },
          '$workflow->workflowTemplate.name$': {
            [Sequelize.Op.iLike]: `%${filters.workflow_name}%`,
          },
        },
      });
    }

    // Handle task template id.
    if (_.has(filters, 'task_template_id')) {
      sequelizeOptions.filters[Sequelize.Op.and].push({
        task_template_id: filters.task_template_id,
      });
    } else if (_.has(filters, 'task_template_id_list')) {
      const parsedTaskTemplateIdList = filters.task_template_id_list.map((v) => parseInt(v)).filter((v) => !isNaN(v));
      sequelizeOptions.filters[Sequelize.Op.and].push({
        task_template_id: { [Sequelize.Op.in]: parsedTaskTemplateIdList },
      });
    }

    if (_.has(filters, 'workflow_template_id')) {
      sequelizeOptions.filters[Sequelize.Op.and].push({
        '$workflow.workflow_template_id$': filters.workflow_template_id,
      });
    }
    if (_.has(filters, 'workflow_created_by')) {
      sequelizeOptions.filters[Sequelize.Op.and].push(
        Sequelize.literal(`workflow.user_data ->> 'userName' ilike '%${SqlString.escape(filters.workflow_created_by).replace(/'/g, '')}%'`),
      );
    }
    if (_.has(filters, 'performer_username')) {
      sequelizeOptions.filters[Sequelize.Op.and].push(
        Sequelize.literal(`array_to_string(performer_usernames, '||') ilike '%${SqlString.escape(filters.performer_username).replace(/'/g, '')}%'`),
      );
    }
    if (_.has(filters, 'without_performer_username')) {
      if (filters.without_performer_username === true) {
        sequelizeOptions.filters[Sequelize.Op.and].push(Sequelize.literal('array_to_string(performer_usernames, \'||\') = \'\''));
      } else {
        sequelizeOptions.filters[Sequelize.Op.and].push(Sequelize.literal('array_to_string(performer_usernames, \'||\') != \'\''));
      }
    }

    if (_.has(filters, 'name')) {
      sequelizeOptions.filters[Sequelize.Op.and].push({
        [Sequelize.Op.or]: {
          name: {
            [Sequelize.Op.iLike]: `%${filters.name}%`,
          },
          '$taskTemplate.name$': {
            [Sequelize.Op.iLike]: `%${filters.name}%`,
          },
          '$taskTemplate->documentTemplate.name$': {
            [Sequelize.Op.iLike]: `%${filters.name}%`,
          },
        },
      });
    }

    // Filter by task meta user IPN.
    if (_.has(filters, 'meta.user.ipn')) {
      sequelizeOptions.filters['meta.user.ipn'] = filters['meta.user.ipn'];
    }

    if (_.has(filters, 'meta.pib')) {
      sequelizeOptions.filters[Sequelize.Op.and].push({
        [Sequelize.Op.and]: {
          'meta.pib': {
            [Sequelize.Op.iLike]: `%${_.get(filters, 'meta.pib')}%`,
          },
        },
      });
      _.unset(filters, 'meta.pib');
    }

    // Filter by task meta statusId.
    if (_.has(filters, 'meta.statusId')) {
      sequelizeOptions.filters['meta.statusId'] = _.get(filters, 'meta.statusId');
    }

    if (_.has(filters, 'is_read')) {
      if (filters['is_read'] === true) {
        sequelizeOptions.filters['meta.isRead'] = filters['is_read'];
      } else {
        sequelizeOptions.filters['meta.isRead'] = null;
      }
    }

    if (_.has(filters, 'meta')) {
      sequelizeOptions.filters[Sequelize.Op.and].push({ meta: filters.meta });
    }

    if (_.has(filters, 'labels')) {
      sequelizeOptions.filters[Sequelize.Op.and].push({ labels: { [Sequelize.Op.contains]: filters.labels } });
    }

    if (_.has(filters, 'due_date_from') || _.has(filters, 'due_date_to')) {
      const from = filters['due_date_from'];
      const to = filters['due_date_to'];
      if (from) {
        sequelizeOptions.filters['due_date'] = { ...sequelizeOptions.filters['due_date'], [Sequelize.Op.gt]: from };
      }
      if (to) {
        sequelizeOptions.filters['due_date'] = { ...sequelizeOptions.filters['due_date'], [Sequelize.Op.lt]: to };
      }
    }

    if (_.has(filters, 'draft_expired_at_to')) {
      const to = filters['draft_expired_at_to'];
      sequelizeOptions.filters['draft_expired_at'] = { ...sequelizeOptions.filters['draft_expired_at'], [Sequelize.Op.lt]: to };
    }

    if (_.has(filters, 'is_current')) {
      sequelizeOptions.filters['is_current'] = filters['is_current'];
    }

    sequelizeOptions.filters['is_system'] = false;

    sort = this.prepareSort(sort);
    if (sort.length > 0) {
      sequelizeOptions.sort = sort;
    }

    return sequelizeOptions;
  }

  /**
   * Get statistics by UnitId group by template.
   * @param {number} unitId UnitId.
   * @param {object} options Options.
   * @param {object} options.sort Sort.
   * @param {object} options.filters Filters.
   * @returns {Promise<object>} statistics Statistics.
   */
  async getTemplateStatisticsByUnitId(unitId, options) {
    // Prepare optional params.
    const query = this.prepareOptionsForQuery(options);

    // Add main params.
    query.where.performer_units = { [Sequelize.Op.contains]: [unitId] };
    query.include = [
      {
        model: models.taskTemplate.model,
        attributes: ['name', 'id'],
      },
    ];
    query.attributes = [[Sequelize.fn('count', Sequelize.col('task.id')), 'tasks']];
    query.group = ['taskTemplate.id'];

    // Get statistics.
    const statistics = await this.model.findAll(query);

    if (!statistics.length) return null;

    return statistics;
  }

  /**
   * Get statistics by UnitId group by status.
   * @param {number} unitId UnitId.
   * @param {object} options Options.
   * @param {object} options.sort Sort.
   * @param {object} options.filters Filters.
   * @returns {Promise<object>} statistics Statistics.
   */
  async getStatusStatisticsByUnitId(unitId, options) {
    // Prepare optional params.
    const query = this.prepareOptionsForQuery(options);

    // Add main params.
    query.where.performer_units = { [Sequelize.Op.contains]: [unitId] };
    query.attributes = ['finished', [Sequelize.fn('count', Sequelize.col('task.id')), 'tasks']];
    query.group = ['finished'];

    // Get statistics.
    const statistics = await this.model.findAll(query);

    if (!statistics.length) return null;

    return statistics;
  }

  /**
   * Get list by UnitId.
   * @param {number} unitId UnitId.
   * @param {object} options Options.
   * @param {object} options.page Current page.
   * @param {object} options.count Items per page.
   * @param {object} options.sort Sort.
   * @param {object} options.filters Filters.
   * @returns {Promise<object>} statistics Statistics.
   */
  async getListByUnitId(unitId, options) {
    // Prepare optional params.
    const query = this.prepareOptionsForQuery(options);

    // Add main params.
    query.where.performer_units = { [Sequelize.Op.contains]: [unitId] };

    // Get statistics.
    const list = await this.model.paginate(query);

    if (!list.data.length) {
      return null;
    }

    // todo Rewrite with getAllByUserId method using TaskEntity.
    list.data = list.data.map((item) => {
      return {
        id: item.id,
        workflowId: item.workflow_id,
        name: item.name,
        description: item.description,
        taskTemplateId: item.task_template_id,
        documentId: item.document_id,
        signerUsers: item.signer_users,
        signerUsernames: item.signer_usernames,
        performerUsers: item.performer_users,
        performerUsernames: item.performer_usernames,
        performerUnits: item.performer_units,
        requiredPerformerUnits: item.required_performer_units,
        tags: item.tags,
        data: item.data,
        finished: item.finished,
        finishedAt: item.finished_at,
        deleted: item.deleted,
        isEntry: item.is_entry,
        cancellationTypeId: item.cancellation_type_id,
        createdBy: item.created_by,
        updatedBy: item.updated_by,
        dueDate: item.due_date,
        copyFrom: item.copy_from,
        isCurrent: item.is_current,
        meta: {
          isRead: item.meta && item.meta.isRead,
        },
        onlyForHeads: item.only_for_heads,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    });

    return list;
  }

  /**
   * Prepare query params.
   * @param {object} [options] Options object.
   * @param {object} [options.filters] Filters.
   * @param {array} [options.order] Order.
   * @returns {object} Query.
   */
  prepareOptionsForQuery(options) {
    const query = {
      where: {},
      order: [],
    };

    if (options.filters.performer_units) {
      query.where.performer_units = options.filters.performer_units;
    }

    if (options.page && options.count) {
      query.currentPage = options.page;
      query.perPage = options.count;
    }

    if (options.filters.task_status) {
      options.filters.task_status === 'finished' && (query.where.finished = true);
      options.filters.task_status === 'deleted' && (query.where.deleted = true);
    }

    options.filters.task_template_id && (query.where.task_template_id = options.filters.task_template_id);

    options.filters.performer_users && (query.where.performer_users = options.filters.performer_users);

    if (options.filters.is_performers_users_must_be_defined) {
      query.where.performer_users = Sequelize.literal('performer_users != \'{}\'::CHARACTER VARYING[]');
    }

    if (options.filters.date && options.filters.date.from && options.filters.date.to) {
      let from = new Date(options.filters.date.from).toISOString();
      let to = new Date(options.filters.date.to).toISOString();
      query.where.created_at = {
        [Sequelize.Op.between]: [from, to],
      };
    }

    if (options.sort && options.sort.by.length > 0) {
      if (options.sort.by.length > 1) {
        options.sort.by.forEach((column) => {
          column === 'tasks' && query.order.push([Sequelize.literal('tasks'), options.sort.order]);
        });
      } else {
        options.sort.by[0] === 'tasks' && query.order.push([Sequelize.literal('tasks'), options.sort.order[0]]);
      }
    }

    return query;
  }

  /**
   * Remove performer user from tasks by performer user ID and performer unit ID.
   * @returns {Promise<TaskEntity[]>}
   */
  async removePerformerUserFromTasks(userId, unitId) {
    const [, updatedTasks] = await this.model.update(
      { performer_users: Sequelize.fn('array_remove', Sequelize.col('performer_users'), userId) },
      {
        where: {
          performer_users: { [Sequelize.Op.overlap]: [userId] },
          performer_units: { [Sequelize.Op.overlap]: [unitId] },
        },
        returning: true,
      },
    );

    if (updatedTasks.length > 0) {
      return updatedTasks.map((item) => {
        return this.prepareEntity(item);
      });
    }
  }

  /**
   * Set `signWithoutPerformerAvailable`.
   * @param id Task ID.
   * @param userId User ID.
   * @param signWithoutPerformerAvailable Sign without performer available indicator.
   * @returns {Promise<*>}
   */
  async setSignWithoutPerformerAvailable(id, userId, signWithoutPerformerAvailable = false) {
    // Update task.
    const { data: oldData } = this.findById(id);
    const task = this.prepareForModel({
      data: { ...oldData, signWithoutPerformerAvailable },
      updatedBy: userId,
    });
    const [, updatedTask] = await this.model.update(task, { where: { id: id }, returning: true });

    // Return updated task.
    if (updatedTask.length === 1) {
      return this.prepareEntity(updatedTask[0]);
    }
  }

  /**
   * Set `signWithoutPerformerAvailable` by document ID.
   * @param id Task ID.
   * @param userId User ID.
   * @param signWithoutPerformerAvailable Sign without performer available indicator.
   * @returns {Promise<*>}
   */
  async setSignWithoutPerformerAvailableByDocumentId(documentId, userId, signWithoutPerformerAvailable = false) {
    // Update task.
    const { data: oldData } = this.findByDocumentId(documentId);
    const task = this.prepareForModel({
      data: { ...oldData, signWithoutPerformerAvailable },
      updatedBy: userId,
    });
    const [, updatedTask] = await this.model.update(task, { where: { document_id: documentId }, returning: true });

    // Return updated task.
    if (updatedTask.length === 1) {
      return this.prepareEntity(updatedTask[0]);
    }
  }

  /**
   * @param {TaskEntity.id} taskId
   * @param {TaskActivity} activity
   * @return {Promise<TaskEntity>}
   */
  async appendActivityLog(taskId, activity) {
    try {
      const result = await this.db.query('UPDATE tasks SET activity_log = activity_log || :activity::jsonb WHERE id = :id RETURNING *;', {
        replacements: {
          id: taskId,
          activity: JSON.stringify(activity),
        },
      });
      const [[updatedTask]] = result;
      return this.prepareEntity(updatedTask);
    } catch (error) {
      throw new SequelizeDbError(error);
    }
  }

  /**
   * Set draft expired at.
   * @param {string} id Task ID.
   * @param {string} draftExpiredAt Draft expired at.
   * @returns {Promise<TaskEntity>} Updated task entity promise.
   */
  async setDrafExpiredAt(id, draftExpiredAt) {
    // Update.
    const [, updatedTasks] = await this.model.update({ draft_expired_at: draftExpiredAt }, { where: { id }, returning: true });

    // Check if 1 row updated.
    if (updatedTasks && updatedTasks.length === 1) {
      // Define and return first updated row entity.
      const [updatedTask] = updatedTasks;
      return this.prepareEntity(updatedTask);
    }
  }

  /**
   * Obtain the latest timestamp for tasks of a user.
   * @param {string} userId User ID.
   * @param {number} ttl Max cache TTL in seconds.
   * @returns {Promise<string>} Timestamp.
   */
  async getTasksTimestampByUserId(userId, ttl = 600) {
    // Limit queries with twice as cache TTL back in time.
    const interval = `${ttl * 2} seconds`;

    /*
      1. Get the lastest changes in workflows created or updated by the user.
      2. Get the latest changes in tasks created or updated by the user or assigned to the user.
      3. Get the latest changes in documents of the tasks.
      4. Combine all timestamps and return the latest one.
    */
    const [{ latest }] = await this.db.query(
      `
        SELECT GREATEST(
          (
            WITH filtered_workflows AS (
              SELECT id, updated_at
              FROM workflows
              WHERE updated_at > NOW() - INTERVAL :interval
                AND (created_by = :userId OR updated_by = :userId)
            )
            SELECT GREATEST(MAX(w.updated_at), MAX(d.updated_at), MAX(t.updated_at))
            FROM filtered_workflows w
            LEFT JOIN tasks t ON t.workflow_id = w.id
            LEFT JOIN documents d ON d.id = t.document_id
          ),
          (
            WITH filtered_tasks AS (
              SELECT document_id, updated_at
              FROM tasks
              WHERE updated_at > NOW() - INTERVAL :interval
                AND (
                  created_by = :userId
                  OR updated_by = :userId
                  OR :userId = ANY (performer_users)
                  OR :userId = ANY (signer_users)
                )
            )
            SELECT GREATEST(MAX(t.updated_at), MAX(d.updated_at))
            FROM filtered_tasks t
            LEFT JOIN documents d ON d.id = t.document_id
          )
        ) AS latest
      `,
      {
        replacements: { userId, interval },
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    return latest;
  }

  /**
   * Get task created today by templateId.
   * @param {number} templateId Template Id.
   * @param {object} options options.
   * @param {array} options.attributes attributes.
   * @returns {Promise<{data: TaskEntity[]}>} Model response with task entities list promise.
   */
  async getTaskCreatedTodayByTemplateId(templateId, options) {
    const { attributes = [] } = options;

    const tasks = await this.model.findAll({
      where: {
        task_template_id: templateId,
        created_at: { [Sequelize.Op.gte]: moment().format('YYYY-MM-DD') },
      },
      attributes,
    });
    return tasks.map(this.prepareEntity);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {TaskEntity}
   */
  prepareEntity(item) {
    return new TaskEntity({
      id: item.id,
      workflowId: item.workflow_id,
      name: item.name,
      description: item.description,
      taskTemplateId: item.task_template_id,
      documentId: item.document_id,
      signerUsers: item.signer_users,
      signerUserNames: item.signer_usernames,
      performerUsers: item.performer_users,
      performerUsersIpn: item.performer_users_ipn,
      performerUsersEmail: item.performer_users_email,
      performerUserNames: item.performer_usernames,
      performerUnits: item.performer_units,
      requiredPerformerUnits: item.required_performer_units,
      tags: item.tags,
      data: item.data,
      cancellationTypeId: item.cancellation_type_id,
      finished: item.finished,
      finishedAt: item.finished_at,
      deleted: item.deleted,
      isEntry: item.is_entry,
      createdBy: item.created_by,
      updatedBy: item.updated_by,
      dueDate: item.due_date,
      copyFrom: item.copy_from,
      isCurrent: item.is_current,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      onlyForHeads: item.only_for_heads,
      taskTemplate: {
        jsonSchema: item.taskTemplate?.json_schema && JSON.parse(item.taskTemplate.json_schema),
      },
      document: {
        number: item.document && item.document.number,
        createdAt: item.document && item.document.created_at,
        updatedAt: item.document && item.document.updated_at,
      },
      workflow: {
        id: item.workflow && item.workflow.id,
        number: item.workflow && item.workflow.number,
        userData: item.workflow && item.workflow.user_data,
        data: item.workflow && item.workflow.data,
        workflowTemplate: {
          data: item.workflow && item.workflow.workflowTemplate && item.workflow.workflowTemplate.data,
        },
      },
      meta: item.meta,
      observerUnits: item.observer_units,
      isSystem: item.is_system,
      labels: item.labels,
      version: item.version,
      activityLog: item.activity_log,
      draftExpiredAt: item.draft_expired_at,
    });
  }

  /**
   * Prepare for model.
   * @param {TaskEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      workflow_id: item.workflowId,
      name: item.name,
      description: item.description,
      task_template_id: item.taskTemplateId,
      document_id: item.documentId,
      signer_users: item.signerUsers,
      signer_usernames: item.signerUserNames,
      performer_users: item.performerUsers,
      performer_users_ipn: item.performerUsersIpn,
      performer_users_email: item.performerUsersEmail,
      performer_usernames: item.performerUserNames,
      performer_units: item.performerUnits,
      required_performer_units: item.requiredPerformerUnits,
      tags: item.tags,
      data: item.data,
      cancellation_type_id: item.cancellationTypeId,
      finished: item.finished,
      finished_at: item.finishedAt,
      deleted: item.deleted,
      is_entry: item.isEntry,
      created_by: item.createdBy,
      updated_by: item.updatedBy,
      due_date: item.dueDate,
      copy_from: item.copyFrom,
      meta: item.meta,
      only_for_heads: item.onlyForHeads,
      observer_units: item.observerUnits,
      is_system: item.isSystem,
      labels: item.labels,
      version: item.version,
      activity_log: item.activityLog,
      draft_expired_at: item.draftExpiredAt,
    };
  }
}

module.exports = TaskModel;
