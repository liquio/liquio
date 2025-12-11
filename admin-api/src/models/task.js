const Sequelize = require('sequelize');
const _ = require('lodash');
const Model = require('./model');
const TaskEntity = require('../entities/task');

/**
 * Task Model.
 * @typedef {import('../entities/document')} DocumentEntity.
 */
class TaskModel extends Model {
  constructor(dbInstance) {
    if (!TaskModel.singleton) {
      super(dbInstance);

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
          performer_users: Sequelize.ARRAY(Sequelize.STRING),
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
          observer_units: Sequelize.ARRAY(Sequelize.INTEGER),
          activity_log: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: [],
          },
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
   * @param {object} options Options.
   * @returns {Promise<{data: TaskEntity[]}>}
   */
  async getAllByUserId(userId, userUnitIds, { currentPage, perPage, filters, sort, onboardingTaskTemplateId }) {
    const sequelizeOptions = this.formOptionsToGetAllByUserId(userId, userUnitIds, currentPage, perPage, filters, sort, onboardingTaskTemplateId);

    let tasks = await this.model.paginate(sequelizeOptions);

    tasks.data = tasks.data.map((item) => {
      return this.prepareEntity(item);
    });

    return tasks;
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

    tasks = tasks.map((item) => {
      let task = this.prepareEntity(item);
      if (item.document) {
        task.document = item.document.prepareEntity(item.document);
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
  async findById(id) {
    const task = await this.model.findByPk(id, {
      include: [{ model: models.workflow.model }],
    });

    if (!task) {
      return;
    }

    if (task.document) {
      task.document = task.document.prepareEntity(task.document);
    }

    if (task.workflow) {
      task.workflow = task.workflow.prepareEntity(task.workflow);
    }

    return this.prepareEntity(task);
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
   * Find document by workflow ID and task template ID.
   * @param {string} workflowId Workflow ID.
   * @param {string} taskTemplateId Task template ID.
   * @returns {Promise<{task: TaskEntity, document: DocumentEntity}>} Task and document entities promise.
   */
  async findDocumentByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId) {
    // Find task.
    const task = await this.model.findOne({
      include: [{ model: models.document.model }],
      where: { workflow_id: workflowId, task_template_id: taskTemplateId, is_current: true },
    });

    // Check.
    if (!task) {
      return;
    }

    // Define and return task and document entities.
    const taskEntity = this.prepareEntity(task);
    const documentEntity = task.document.prepareEntity(task.document);
    return { task: taskEntity, document: documentEntity };
  }

  /**
   * Find document by workflow ID and task template IDs.
   * @param {string} workflowId Workflow ID.
   * @param {string} taskTemplateId Task template ID.
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
    });

    // Check.
    if (!task) {
      return;
    }

    // Define and return task and document entities.
    const taskEntity = this.prepareEntity(task);
    const documentEntity = task.document.prepareEntity(task.document);
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
   * @param {string[]} users Performer user.
   * @returns {Promise<TaskEntity[]>} Task entity list.
   */
  async getByPerformerUser(users) {
    const tasks = await this.model.findAll({ where: { performer_users: users, is_current: true } });

    return tasks.map((item) => {
      return this.prepareEntity(item);
    });
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
   * @returns {Promise<{taskId, documentId, taskPerformerUsers, taskPerformerUnits}[]>} Promise of tasks info list.
   */
  async getTaskAndDocumentMainInfo(workflowId) {
    const tasksInfo = await this.model.findAll({
      where: { workflow_id: workflowId, is_current: true, finished: true },
      attributes: ['id', 'document_id', 'performer_users', 'performer_units'],
    });

    return tasksInfo.map((item) => ({
      taskId: item.id,
      documentId: item.document_id,
      taskPerformerUsers: item.performer_users,
      taskPerformerUnits: item.performer_units,
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
   * @param {string[]} [data.performerUsers] Performer users IDs.
   * @param {string[]} [data.performerUserNames] Performer usernames.
   * @param {string[]} [data.signerUsers] Signer users IDs.
   * @param {string} [data.dueDate] Due date.
   * @param {boolean} [data.isEntry] Is entry.
   * @param {string} [data.copyFrom] Copy from. Original task ID.
   * @returns {Promise<TaskEntity>} Created task entity promise.
   */
  async create({
    taskTemplateId,
    workflowId,
    documentId,
    userId,
    performerUnits = [],
    performerUsers = [],
    performerUserNames = [],
    signerUsers = [],
    dueDate,
    isEntry,
    copyFrom,
  }) {
    // Prepare task record.
    const task = this.prepareForModel({
      taskTemplateId,
      workflowId,
      documentId,
      createdBy: userId,
      updatedBy: userId,
      performerUnits,
      performerUsers,
      performerUserNames,
      signerUsers,
      dueDate,
      isEntry,
      copyFrom,
    });

    // Create and return task.
    const createdTask = await this.model.create(task);

    // Return created task.
    return this.prepareEntity(createdTask);
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
   * @returns {Promise<TaskEntity>} Updated task entity promise.
   */
  async setStatusFinished(id, performerUsers) {
    // Prepare update object.
    const updateObject = {
      finished: true,
      finished_at: Sequelize.fn('NOW'),
    };
    if (performerUsers) {
      updateObject.performer_users = performerUsers;
    }

    // Update.
    const [, updatedTasks] = await this.model.update(updateObject, {
      where: { id },
      returning: true,
    });

    // Check DB response.
    if (updatedTasks.length !== 1) {
      return;
    }

    // Return updated task.
    return this.prepareEntity(updatedTasks[0]);
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
   * @returns {Promise<TaskEntity>} Updated task entity promise.
   */
  async setSignerUsers(id, signerUsers) {
    // Update.
    const [, updatedTasks] = await this.model.update({ signer_users: signerUsers }, { where: { id }, returning: true });

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
   * Find current task by workflow ID and task template ID.
   * @param {string} workflowId Workflow ID.
   * @param {number} taskTemplateId Task template ID.
   * @returns {Promise<TaskEntity>}
   */
  async findCurrentTaskByWorkflowIdAndTaskTemplateID(workflowId, taskTemplateId) {
    let task = await this.model.findOne({
      include: [{ model: models.document.model }],
      where: { workflow_id: workflowId, task_template_id: taskTemplateId, is_current: true },
    });

    if (!task) {
      return;
    }

    let taskEntity = this.prepareEntity(task);
    if (task.document) {
      taskEntity.document = task.document.prepareEntity(task.document);
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
   * @returns {Promise<number>} Unread tasks quantity.
   */
  async getUnreadTasksCount(userId, userUnitIds, { filters, sort, onboardingTaskTemplateId }) {
    // Get sequlize options.
    const sequelizeOptions = this.formOptionsToGetAllByUserId(userId, userUnitIds, undefined, undefined, filters, sort, onboardingTaskTemplateId);

    // Count unread tasks.
    const unreadTasks = await this.model.count({
      where: {
        ...sequelizeOptions.filters,
        meta: { isRead: false },
      },
    });

    return unreadTasks;
  }

  /**
   * Get tasks in progress.
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<EventEntity[]>} Event entities list promise.
   */
  async getTasksInProgress(workflowId) {
    const tasks = await this.model.findAll({ where: { workflow_id: workflowId, finished: false } });
    return tasks.map((item) => this.prepareEntity(item));
  }

  /**
   * Set cancelled.
   * @param {string|string[]} id Task ID or IDs list.
   */
  async setCancelled(id) {
    await this.model.update({ cancellation_type_id: 1, finished: true, finished_at: Sequelize.fn('NOW') }, { where: { id } });
  }

  /**
   * Cancel all in progress.
   * @param {string} workflowId Workflow ID.
   */
  async cancelAllInProgress(workflowId) {
    await this.model.update(
      { cancellation_type_id: 2, finished: true, finished_at: Sequelize.fn('NOW') },
      { where: { workflow_id: workflowId, finished: false } },
    );
  }

  /**
   * Get documents by workflow id.
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<DocumentEntity[]>}
   */
  async getDocumentsByWorkflowId(workflowId) {
    const tasks = await this.model.findAll({
      where: { workflow_id: workflowId, is_current: true },
    });
    let documents = [];
    if (tasks) {
      for (const task of tasks) {
        const document = await task.getDocument();
        if (document) {
          documents.push(models.document.prepareEntity(document));
        }
      }
    }

    return documents;
  }

  /**
   * Update data.
   * @param {string} id Document ID.
   * @param {object} data Data.
   * @returns {Promise<DocumentEntity>}
   */
  async update(id, data) {
    const task = this.prepareForModel(data);
    const [, updatedTask] = await this.model.update(task, {
      where: { id: id },
      returning: true,
    });

    if (updatedTask.length === 1) {
      return this.prepareEntity(updatedTask[0]);
    }
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
      performerUsers: item.performer_users,
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
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      document: {
        number: item.document && item.document.number,
      },
      workflow: {
        number: item.workflow && item.workflow.number,
        userData: item.workflow && item.workflow.user_data,
      },
      meta: item.meta,
      observerUnits: item.observer_units,
      activityLog: item.activity_log,
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
      performer_users: item.performerUsers,
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
      observer_units: item.observerUnits,
      activity_log: item.activityLog,
    };
  }

  /**
   * Form sequelize options to get tasks by user ID.
   * @param {string} userId User ID.
   * @param {number[]} userUnitIds User unit IDs.
   * @param {object} options Options.
   * @returns {object} sequelizeOptions
   */
  formOptionsToGetAllByUserId(userId, userUnitIds, currentPage, perPage, filters, sort, onboardingTaskTemplateId) {
    let sequelizeOptions = {
      currentPage,
      perPage,
      filters: {
        ..._.pick(filters, ['finished', 'deleted']),
      },
    };

    sequelizeOptions.filters[Sequelize.Op.and] = [];

    if (onboardingTaskTemplateId) {
      sequelizeOptions.filters.task_template_id = {
        [Sequelize.Op.ne]: onboardingTaskTemplateId,
      };
    }

    if (typeof filters['assigned_to'] !== 'undefined') {
      if (filters['assigned_to'] === 'me') {
        sequelizeOptions.filters[Sequelize.Op.or] = [
          { performer_users: { [Sequelize.Op.overlap]: [userId] } },
          { signer_users: { [Sequelize.Op.overlap]: [userId] } },
        ];
      } else if (filters['assigned_to'] === 'unit') {
        sequelizeOptions.filters[Sequelize.Op.and] = [{ performer_units: { [Sequelize.Op.overlap]: userUnitIds } }];
      }
    } else {
      sequelizeOptions.filters[Sequelize.Op.and] = [
        {
          [Sequelize.Op.or]: [
            { performer_users: { [Sequelize.Op.overlap]: [userId] } },
            { signer_users: { [Sequelize.Op.overlap]: [userId] } },
            { performer_units: { [Sequelize.Op.overlap]: userUnitIds } },
          ],
        },
      ];
    }

    if (typeof filters['closed_by'] !== 'undefined') {
      sequelizeOptions.filters['finished'] = true;
      if (filters['closed_by'] === 'me') {
        sequelizeOptions.filters['updated_by'] = userId;
      } else if (filters['closed_by'] === 'unit' && typeof filters['assigned_to'] !== 'undefined' && filters['assigned_to'] !== 'unit') {
        sequelizeOptions.filters[Sequelize.Op.and].push({
          performer_units: { [Sequelize.Op.overlap]: userUnitIds },
        });
      }
    }

    sequelizeOptions.include = [
      { model: models.document.model, required: true, attributes: ['number'] },
      { model: models.workflow.model, required: true, attributes: ['number', 'user_data'] },
    ];

    if (typeof filters.name !== 'undefined') {
      sequelizeOptions.include.push({
        model: models.taskTemplate.model,
        attributes: ['name'],
        required: true,
        include: [{ model: models.documentTemplate.model, attributes: ['name'] }],
      });

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

    sort = this.prepareSort(sort);
    if (sort.length > 0) {
      sequelizeOptions.sort = sort;
    }

    return sequelizeOptions;
  }

  /**
   * Get all.
   * @returns {Promise<TaskEntity[]>}
   */
  async getAll({ currentPage, perPage, filters, sort }) {
    let sequelizeOptions = {
      currentPage,
      perPage,
      include: [{ model: models.document.model, include: [{ model: models.documentTemplate.model }] }],
      filters: { is_current: true },
      sort: [['created_at', 'desc']],
    };

    if (filters['id']) {
      sequelizeOptions.filters['id'] = filters['id'];
    }

    if (filters['workflow_id']) {
      sequelizeOptions.filters['workflow_id'] = filters['workflow_id'];
    }

    if (filters['user_ids']) {
      sequelizeOptions.filters[Sequelize.Op.or] = [
        { performer_users: { [Sequelize.Op.overlap]: filters['user_ids'] } },
        { signer_users: { [Sequelize.Op.overlap]: filters['user_ids'] } },
        { performer_units: { [Sequelize.Op.overlap]: filters['user_unit_ids'] } },
        { observer_units: { [Sequelize.Op.overlap]: filters['user_unit_ids'] } },
      ];
    }

    if (filters['user_id_list']) {
      sequelizeOptions.filters[Sequelize.Op.or] = [
        { performer_users: { [Sequelize.Op.overlap]: filters['user_id_list'] } },
        { signer_users: { [Sequelize.Op.overlap]: filters['user_id_list'] } },
      ];
    }

    if (filters['document_id']) {
      sequelizeOptions.filters['$document.id$'] = filters['document_id'];
    }

    sort = this.prepareSort(sort);
    if (sort.length > 0) {
      sequelizeOptions.sort = sort;
    }

    let tasks = await this.model.paginate(sequelizeOptions);

    tasks.data = tasks.data.map((item) => {
      let task = this.prepareEntity(item);
      if (item.document) {
        task.document = item.document.prepareEntity(item.document);
        if (item.document.documentTemplate) {
          task.document.documentTemplate = {
            id: item.document.documentTemplate.id,
            name: item.document.documentTemplate.name,
          };
        }
      }
      return task;
    });

    return tasks;
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
}

module.exports = TaskModel;
