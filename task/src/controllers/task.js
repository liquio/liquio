const { matchedData } = require('express-validator');
const Controller = require('./controller');
const AuthController = require('./auth');
const TaskModel = require('../models/task');
const DocumentAttachmentModel = require('../models/document_attachment');
const UnitModel = require('../models/unit');
const Auth = require('../services/auth');
const CustomLogs = require('../services/custom_logs');
const TaskActivity = require('../types/task_activity');
const Helpers = require('../lib/helpers');
const { ERROR_TASK_NOT_FOUND } = require('../constants/error');
const { NotFoundError } = require('../lib/errors');

/** @var {TaskBusiness} businesses.task */

/**
 * Task controller.
 */
class TaskController extends Controller {
  /**
   * Task controller constructor.
   */
  constructor() {
    // Define singleton.
    if (!TaskController.singleton) {
      super();
      this.taskModel = new TaskModel();
      this.documentAttachmentModel = new DocumentAttachmentModel();
      this.unitModel = new UnitModel();
      this.auth = new Auth().provider;
      this.customLogs = new CustomLogs();
      this.authController = AuthController.getInstance();
      TaskController.singleton = this;
    }
    return TaskController.singleton;
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    // Define params.
    const { workflowId, workflowTemplateId, taskTemplateId, parentDocumentId, copyFrom, initData } = req.body;
    const userInfo = this.getRequestUserInfo(req);
    const userId = this.getRequestUserId(req);
    const oauthToken = this.getRequestUserAccessToken(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const userUnits = this.getRequestUserUnits(req);
    const userUnitsEntities = this.getRequestUserUnitEntities(req);
    const enabledMocksHeader = req.get('enabled-mocks');

    // Get original document if need it.
    let originalDocument;
    let originalWorkflowTemplateId;
    if (copyFrom) {
      // Try to get original task.
      try {
        // Get original task.
        const originalTask = await businesses.task.findByIdAndCheckAccess(copyFrom, userId, userUnitIds, true);

        // Check is entry.
        const { isEntry, document, workflowId } = originalTask;
        if (!isEntry) {
          throw new Error('Original task should be entry.');
        }

        // Get original workflow template ID.
        const originalWorkflow = await models.workflow.findById(workflowId);
        const { workflowTemplateId } = originalWorkflow;

        // Get original document.
        originalDocument = document;
        originalWorkflowTemplateId = workflowTemplateId;
      } catch (error) {
        return this.responseError(res, error, error.httpStatusCode);
      }
    }

    // Create task.
    let createdTask;
    try {
      createdTask = await businesses.task.create({
        workflowId,
        workflowTemplateId: workflowTemplateId || originalWorkflowTemplateId,
        taskTemplateId,
        parentDocumentId,
        userInfo,
        userId,
        oauthToken,
        unitIds: userUnitIds,
        userUnits,
        userUnitsEntities,
        copyFrom,
        originalDocument,
        initData,
        enabledMocksHeader,
      });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, this.filterResponse(createdTask));

    // Save custom logs.
    this.customLogs.saveCustomLog({ operationType: 'create-document', request: res.responseMeta, document: createdTask.document });
  }

  /**
   * Create by other system.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createByOtherSystem(req, res) {
    log.save('create-by-other-system-request-body', req.body);

    const authorizationToken = req.headers && req.headers.authorization;
    const {
      isAllowedCreateByOtherSystems,
      allowedToCreateByTokens,
      tasksTemplateIds,
      enableRateLimitsChecking = false,
      rateLimits = {},
    } = (config && config.system_task) || {};

    // Define params.
    const { workflowTemplateId, taskTemplateId, parentDocumentId, initData } = req.body;

    if (
      !isAllowedCreateByOtherSystems ||
      !allowedToCreateByTokens.includes(authorizationToken) ||
      !tasksTemplateIds.map((v) => `${v}`).includes(`${taskTemplateId}`)
    ) {
      log.save('create-by-other-system-access-error', {
        tasksTemplateIds,
        taskTemplateId,
        isAllowedCreateByOtherSystems,
        allowedToCreateByTokens: allowedToCreateByTokens && allowedToCreateByTokens.map((v) => `${v.substring(0, 9)}***${v.substring(v.length - 3)}`),
        authorizationToken:
          authorizationToken && `${authorizationToken.substring(0, 9)}***${authorizationToken.substring(authorizationToken.length - 3)}`,
      });
      const accessError = new Error('Create system task by not user is not allowed.');
      return this.responseError(res, accessError, 403);
    }
    const appendMeta = {};
    if (enableRateLimitsChecking) {
      if (!rateLimits || typeof rateLimits !== 'object' || Array.isArray(rateLimits) || Object.keys(rateLimits).length === 0) {
        log.save('create-by-other-system-rate-limits-checking-error-invalid-config', { rateLimits }, 'error');
        const error = new Error('RateLimitsChecking error.');
        return this.responseError(res, error, 500);
      }
      if (rateLimits[`${taskTemplateId}`] && !initData?.signatures) {
        log.save('create-by-other-system-rate-limits-checking-error-init-data-without-signatures', { initData }, 'error');
        const error = new Error('RateLimitsChecking error. signatures must be passed in initData.');
        return this.responseError(res, error, 400);
      }

      let checkRateLimitResult;
      try {
        checkRateLimitResult = await checkRateLimit.bind(this)({ rateLimits, initData, taskTemplateId });
      } catch (error) {
        log.save(
          'create-by-other-system-rate-limits-checking-error-function-error',
          { error: error?.message, rateLimits, initData, taskTemplateId },
          'error',
        );
        return this.responseError(res);
      }

      if (checkRateLimitResult.isReached) {
        log.save(
          'create-by-other-system-rate-limits-checking-error-limit-reached',
          { limit: checkRateLimitResult.limit, reachedIpns: checkRateLimitResult.reachedIpns },
          'error',
        );
        const error = new Error('Rate limit is reached.');
        return this.responseError(res, error, 500);
      }
      if (checkRateLimitResult.externalInitiatorIpns) {
        appendMeta['externalInitiatorIpns'] = checkRateLimitResult.externalInitiatorIpns;
      }
    }

    // Get system name from token.
    const systemName = req.basicAuthUser;

    // Get original document if need it.
    let originalDocument = undefined;
    let originalWorkflowTemplateId = undefined;

    // Append user data to request. Case - request make AI assistent.
    let isForwardedFromRegularUser = false;
    let userInfo;
    let userId;
    let oauthToken;
    let userUnitIds;
    let userUnits;
    let userUnitsEntities;
    if (req.headers.token) {
      let isNextCalled = false;
      await this.authController.getCheckMiddleware(['individual'])(req, res, () => {
        isNextCalled = true;
      });
      if (!isNextCalled) return;
      isForwardedFromRegularUser = true;
      userInfo = this.getRequestUserInfo(req);
      userId = this.getRequestUserId(req);
      oauthToken = this.getRequestUserAccessToken(req);
      userUnitIds = this.getRequestUserUnitIds(req);
      userUnits = this.getRequestUserUnits(req);
      userUnitsEntities = this.getRequestUserUnitEntities(req);
      appendMeta['systemName'] = systemName;
      appendMeta['isAIAssistant'] = true;
    }

    // Create task.
    let createdTask;
    try {
      createdTask = await businesses.task.create({
        workflowTemplateId: workflowTemplateId || originalWorkflowTemplateId,
        taskTemplateId,
        userId: userId || systemName,
        parentDocumentId,
        originalDocument,
        initData,
        unitIds: userUnitIds || {},
        userInfo,
        oauthToken,
        userUnits,
        userUnitsEntities,
        isCreateByOtherSystem: true,
        isForwardedFromRegularUser,
        appendMeta,
      });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }

    this.responseData(res, this.filterResponse(createdTask));

    // Save custom logs.
    this.customLogs.saveCustomLog({ operationType: 'create-document-by-other-system', request: res.responseMeta, document: createdTask.document });

    async function checkRateLimit({ rateLimits, initData, taskTemplateId }) {
      const limit = rateLimits[`${taskTemplateId}`];
      if (!limit) {
        return { isReached: false };
      }
      const { signatures } = initData;
      const signaturesInfo = await businesses.task.getSignaturesInfo(signatures);
      const externalInitiatorIpns = signaturesInfo.map((si) => si?.signer?.ipn?.DRFO).filter(Boolean);
      const taskCreatedToday = await this.taskModel.getTaskCreatedTodayByTemplateId(taskTemplateId, { attributes: ['id', 'meta'] });

      const result = {
        isReached: false,
        limit,
        reachedIpns: [],
        externalInitiatorIpns,
      };

      externalInitiatorIpns.forEach((ipn) => {
        let count = 0;

        taskCreatedToday.forEach(({ meta }) => {
          const { externalInitiatorIpns } = meta || {};
          if (externalInitiatorIpns && Array.isArray(externalInitiatorIpns) && externalInitiatorIpns.includes(ipn)) {
            count += 1;
          }
        });

        if (count >= limit) {
          result.isReached = true;
          result.reachedIpns.push(ipn);
        }
      });

      return result;
    }
  }

  /**
   * Commit.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async commit(req, res) {
    // Define params.
    const taskId = req.params.id;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const userUnits = this.getRequestUserUnitEntities(req);
    const userInfo = this.getRequestUserInfo(req);

    // Check that all users signed all files.
    try {
      const task = await models.task.findById(taskId);
      const document = await models.document.findById(task.document.id); // Get by document model because of json_schema.
      await businesses.document.checkP7SSignaturesCount(document);
    } catch (error) {
      return this.responseError(res, error.message, 500, error.details);
    }

    let finishedTask;
    try {
      const requestMeta = this.getRequestMeta(req);
      finishedTask = await businesses.task.setStatusFinished(taskId, userId, userUnitIds, false, { user: userInfo, units: userUnits }, requestMeta);

      // Send message to RabbitMQ.
      const message = { workflowId: finishedTask.workflowId, taskId: taskId };
      global.messageQueue.produce(message);

      // Response.
      this.responseData(res, message);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }

    // Send document to inboxes if need it.
    businesses.userInbox.sendToInboxesIfNeedIt(finishedTask);

    // Save custom logs.
    this.customLogs.saveCustomLog({
      operationType: 'commit',
      request: res.responseMeta,
      document: finishedTask.document,
      workflowId: finishedTask.workflowId,
    });
  }

  /**
   * Get all tasks.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    // Define params.
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    const queryData = matchedData(req, { locations: ['query'] });

    const sort = await businesses.task.mapSort(queryData.sort || {});
    const filters = queryData.filters || {};

    const { page, count, from_created_at, to_created_at } = queryData;

    // Try to get tasks.
    let tasks;
    try {
      const onboardingTaskTemplateIds = [];
      if (config.onboarding?.onboardingTemplate?.workflowTemplateId && config.onboarding?.onboardingTemplate?.taskTemplateId) {
        onboardingTaskTemplateIds.push(config.onboarding.onboardingTemplate.taskTemplateId);
      }

      // Get tasks info with pagination.
      tasks = await businesses.task.getAllByUserId(
        userId,
        userUnitIds.all,
        userUnitIds.head,
        {
          currentPage: page,
          perPage: count,
          sort: sort,
          filters: filters,
          onboardingTaskTemplateIds,
          fromCreatedAt: from_created_at,
          toCreatedAt: to_created_at,
        },
        userUnitIds,
      );

      // Set `meIsSigner` and `setIsMePerformer` data.
      for (const taskEntity of tasks.data) {
        taskEntity.setIsMeSignerAndPerformer(userId, userUnitIds.all);
      }

      // Filter tasks entities.
      tasks.data = this.filterResponse(tasks.data, true);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, tasks, true);
  }

  /**
   * Find task.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    // Define params.
    const { id } = matchedData(req, { locations: ['params'] });
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Get task.
    let task;
    try {
      task = await businesses.task.findByIdAndCheckAccess(id, userId, userUnitIds);
      task.setIsMeSignerAndPerformer(userId, userUnitIds.all);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    // Try to add multisigner info.
    try {
      const { document } = task;
      const { signatures } = document;
      task.minSignaturesLimitInfo = await businesses.document.handleMinSignaturesLimit({ ...document, task, signatures });
    } catch (error) {
      log.save('signatures-limit-info-not-defined', { taskId: id, message: error && error.message });
    }

    // Response.
    this.responseData(res, this.filterResponse(task));

    // Save custom logs.
    this.customLogs.saveCustomLog({ operationType: 'read-document', request: res.responseMeta, document: task.document });
  }

  /**
   * Get last task by current task ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getLastByWorkflowId(req, res) {
    // Define params.
    const { id: currentTaskId } = req.params;
    const { all } = req.query;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Get last tasks after current.
    let lastTasks;
    let lastTasksWithAccess = [];
    try {
      lastTasks = await models.task.getLastByCurrentTaskId(currentTaskId);

      lastTasks = lastTasks.filter((v) => v.documentId);
      for (const lastTask of lastTasks) {
        if (await lastTask.hasAccess(userId, userUnitIds, false)) {
          lastTasksWithAccess.push(lastTask);
        }
      }
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }
    const [lastTask] = lastTasksWithAccess;
    const lastTaskInList = lastTask ? [lastTask] : [];

    // Response last tasks.
    this.responseData(res, this.filterResponse(all === 'true' ? lastTasksWithAccess : lastTaskInList, true));
  }

  /**
   * Get tasks by performer user.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getByPerformerUser(req, res) {
    const performerUser = req.query.performer_user;

    let tasks;
    try {
      tasks = await this.taskModel.getByPerformerUser(performerUser);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, this.filterResponse(tasks, true));
  }

  /**
   * Get tasks by performer unit.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getByPerformerUnit(req, res) {
    // Define params.
    const performerUnitIds = req.query.performer_unit_ids ? JSON.parse(req.query.performer_unit_ids) : [];
    const userUnitIds = this.getRequestUserUnitIds(req).all;

    // Check.
    const containsOnlyAllowedUnits = performerUnitIds.every((v) => userUnitIds.includes(v));
    if (!containsOnlyAllowedUnits) {
      return this.responseError(res, 'Contains not allowed units.', 400, { performerUnitIds, userUnitIds });
    }

    let tasks;
    try {
      tasks = await this.taskModel.getByPerformerUnit(performerUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, this.filterResponse(tasks, true));
  }

  /**
   * Get tasks by signer unit.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getBySignerUser(req, res) {
    const signerUser = req.query.signer_user;

    let tasks;
    try {
      tasks = await this.taskModel.getBySignerUser(signerUser);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, this.filterResponse(tasks, true));
  }

  /**
   * Change delete state task.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    const taskId = req.params.id;
    const userId = this.getRequestUserId(req);
    const force = req.query?.force === 'true';

    let state;
    let task;
    try {
      const deletingResult = await businesses.task.delete(taskId, userId, { force });
      state = deletingResult && deletingResult.state;
      task = deletingResult && deletingResult.task;
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, state);

    // Save custom logs.
    this.customLogs.saveCustomLog({ operationType: 'delete-document', request: res.responseMeta, document: task.document });
  }

  /**
   * Delete task.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deletePermanent(req, res) {
    const taskId = req.params.id;
    const userId = this.getRequestUserId(req);

    try {
      await businesses.task.deletePermanent(taskId, userId);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseThatAccepted(res);
  }

  /**
   * Recover task.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async recover(req, res) {
    const taskId = req.params.id;
    const userId = this.getRequestUserId(req);

    let state;
    try {
      state = await businesses.task.recover(taskId, userId);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, state);
  }

  /**
   * Set signer users.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async setSignerUsers(req, res) {
    const { id } = req.params;
    const { signerUsers = [] } = req.body;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Set signer users.
    let updatedTask;
    try {
      updatedTask = await businesses.task.setSignerUsers(id, signerUsers, userId, userUnitIds.all);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, this.filterResponse(updatedTask));
  }

  /**
   * Set performer users.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async setPerformerUsers(req, res) {
    const { id } = req.params;
    const { performerUsers = [] } = req.body;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Set performer users.
    let updatedTask;
    try {
      updatedTask = await businesses.task.setPerformerUsers(id, performerUsers, userUnitIds.head, userId);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, this.filterResponse(updatedTask));
  }

  /**
   * Set due date.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async setDueDate(req, res) {
    const { id } = req.params;
    const { dueDate } = req.body;
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Set due date.
    let updatedTask;
    try {
      updatedTask = await businesses.task.setDueDate(id, dueDate, userUnitIds.head);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, this.filterResponse(updatedTask));
  }

  /**
   * Update task metadata.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updateTaskMetadata(req, res) {
    const { id } = req.params;
    const { override } = req.query;
    const { meta } = req.body;
    businesses.task.removeUnsafeMetaFields(meta);
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    let task;
    try {
      task = await businesses.task.findByIdAndCheckAccess(id, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }
    if (!task) {
      const notFoundError = new NotFoundError(ERROR_TASK_NOT_FOUND);
      return this.responseError(res, notFoundError);
    }

    // Set metadata.
    let taskWithMeta;
    try {
      taskWithMeta = await businesses.task.addTaskMetadata(task, userId, override, meta);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, taskWithMeta);
  }

  /**
   * Get unread tasks count.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getUnreadTasksCount(req, res) {
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const queryData = matchedData(req, { locations: ['query'] });
    const sort = queryData.sort || {};
    const filters = queryData.filters || {};

    // Get unread tasks quantity.
    let unreadTasksCount;
    try {
      const onboardingTaskTemplateIds = [];
      if (config.onboarding?.onboardingTemplate?.workflowTemplateId && config.onboarding?.onboardingTemplate?.taskTemplateId) {
        onboardingTaskTemplateIds.push(config.onboarding.onboardingTemplate.taskTemplateId);
      }

      unreadTasksCount = await businesses.task.getUnreadTasksCount(userId, userUnitIds.all, userUnitIds.head, {
        sort: sort,
        filters: filters,
        onboardingTaskTemplateIds,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, { unreadTasksCount });
  }

  /**
   * Calculate signers.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async calcSigners(req, res) {
    // Define params.
    const taskId = req.params.id;
    const userId = this.getRequestUserId(req);
    const multisignerSchemaPath = req.query && req.query.signer_request;
    const userUnitIds = this.getRequestUserUnitIds(req);
    const userInfo = this.getRequestUserInfo(req);

    // Get updated with signers task.
    let taskWithSigners;
    try {
      taskWithSigners = await businesses.task.calcSigners(taskId, multisignerSchemaPath, userId, userUnitIds, userInfo);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Return updated task.
    this.responseData(res, { ...taskWithSigners });
  }

  /**
   * Check signer access.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async checkSignerAccess(req, res) {
    // Define params.
    const taskId = req.params.id;
    const userId = this.getRequestUserId(req);
    const userInfo = this.getRequestUserInfo(req);
    const multisignerSchemaPath = req.query && req.query.signer_request;
    const userUnitIds = this.getRequestUserUnitIds(req);

    let isAccess;
    try {
      isAccess = await businesses.task.checkUserAccessAsSigner(taskId, multisignerSchemaPath, userId, userInfo, userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, { isAccess });
  }

  /**
   * Get the last task ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getLastTaskId(req, res) {
    // Define params.
    const { workflowId, taskTemplateId } = req.params;

    let taskId;
    try {
      taskId = await this.taskModel.findLastTaskId(workflowId, taskTemplateId);
    } catch (error) {
      return this.responseError(res, error);
    }
    if (!taskId) return this.responseError(res, 'Task id not found.', 404);

    this.responseData(res, { taskId });
  }

  /**
   * Assign.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async assign(req, res) {
    // Define params.
    const { id: taskId } = req.params;
    const { newPerformerUsers } = req.body;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    // Get task.
    let task;
    try {
      task = await businesses.task.findByIdAndCheckAccess(taskId, userId, userUnitIds);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }
    if (!task) {
      return this.responseError(res, new NotFoundError(ERROR_TASK_NOT_FOUND));
    }

    // Check task already finished.
    const { finished } = task;
    if (finished) {
      return this.responseError(res, 'Task already finished.', 400);
    }

    // Check optional project params.
    if (global.config?.custom?.optionalProjectParams?.isOnlySinglePerformerUser && newPerformerUsers?.length > 1) {
      return this.responseError(res, 'Performer user can be only one.', 400);
    }

    // Define performer users.
    const { performerUsers: oldPerformerUsers, performerUnits, requiredPerformerUnits } = task;
    const addedPerformerUsers = newPerformerUsers.filter((n) => !oldPerformerUsers.includes(n));
    const removedPerformerUsers = oldPerformerUsers.filter((o) => !newPerformerUsers.includes(o));
    let performerUsersDiff = [...addedPerformerUsers, ...removedPerformerUsers];

    // But, that is strange checking with "removedPerformerUsers".
    if (global.config?.custom?.optionalProjectParams?.userRoleUnits?.superHeadUnitId) {
      performerUsersDiff = addedPerformerUsers;
    }

    // Check if performer users can be changed.
    let headUnits;
    try {
      headUnits = await this.unitModel.getByIds(userUnitIds.head);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }
    const userHeadUnitsMembers = headUnits.reduce((t, v) => [...t, ...v.members], []);
    const isOnlyUserHeadUnitsMembersChanged = performerUsersDiff.every((u) => userHeadUnitsMembers.includes(u));
    const isOnlyAddedOrRemovedHimself = performerUsersDiff.length === 1 && performerUsersDiff[0] === userId;
    const isOnlyRemoved = addedPerformerUsers.length === 0 && removedPerformerUsers.length > 0;

    // Check optional project params.
    let isUserIsMemberOfSuperHeadUnit = false;
    if (global.config?.custom?.optionalProjectParams?.userRoleUnits?.superHeadUnitId) {
      isUserIsMemberOfSuperHeadUnit = userUnitIds.member.some((v) => v === global.config.custom.optionalProjectParams.userRoleUnits.superHeadUnitId);
    }

    if (!isUserIsMemberOfSuperHeadUnit && !isOnlyUserHeadUnitsMembersChanged && !isOnlyAddedOrRemovedHimself && !isOnlyRemoved) {
      return this.responseError(
        res,
        'All changed performer users should be head units members or current user himself. Removing allowed in any case.',
        400,
        {
          performerUsersDiff,
          userHeadUnitsMembers,
        },
      );
    }

    // Check if zero performers.
    const emptyPerformersAfterHandling = performerUnits.length === 0 && newPerformerUsers.length === 0 && requiredPerformerUnits.length === 0;
    if (emptyPerformersAfterHandling) {
      return this.responseError(res, 'Performers list (users and units together) can not be empty.', 400, {
        performerUsersDiff,
        userHeadUnitsMembers,
      });
    }

    // Define new performer users names.
    let newPerformerUserNames;
    const withPrivateProps = false;
    try {
      const performerUsersData = await this.auth.getUsersByIds(newPerformerUsers, withPrivateProps);
      newPerformerUserNames = performerUsersData.map((v) => v.name);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    // Set performer users.
    let updatedTask;
    try {
      updatedTask = await this.taskModel.setPerformerUsers(taskId, newPerformerUsers, newPerformerUserNames);
    } catch (error) {
      log.save('set-performer-users-error', { error: error?.message, details: error?.details, taskId, newPerformerUsers, newPerformerUserNames });
      return this.responseError(res, error, error.httpStatusCode);
    }

    // Save custom log.
    this.customLogs.saveCustomLog({
      operationType: 'performers-unassigned',
      request: res.responseMeta,
      performerUsers: task.performerUsers,
      performerUserNames: task.performerUserNames,
      performerUnits: task.performerUnits,
      requiredPerformerUnits: task.requiredPerformerUnits,
      workflowId: task.workflowId,
      task: updatedTask,
    });

    this.customLogs.saveCustomLog({
      operationType: 'performers-assigned',
      request: res.responseMeta,
      performerUsers: updatedTask.performerUsers,
      performerUserNames: updatedTask.performerUserNames,
      performerUnits: updatedTask.performerUnits,
      requiredPerformerUnits: updatedTask.requiredPerformerUnits,
      workflowId: updatedTask.workflowId,
      task: updatedTask,
    });

    // Handle activity .
    await businesses.task.handleActivityTypeEvents(updatedTask, 'TASK_PERFORMERS_CHANGED');
    if (global.config.activity_log?.isEnabled) {
      const activity = new TaskActivity({
        type: 'TASK_PERFORMERS_CHANGED',
        details: {
          changeType: 'BY_USER',
          userId: userId,
          userUnits: await Helpers.getUserUnits(userId),
          unassignedUsers: await Helpers.appendUnitIdsToUsers(oldPerformerUsers),
          unassignedUnits: [],
          assignedUsers: await Helpers.appendUnitIdsToUsers(newPerformerUsers),
          assignedUnits: [],
        },
      });
      const taskWithCurrentActivityLog = await models.task.appendActivityLog(updatedTask.id, activity);
      updatedTask.activityLog = taskWithCurrentActivityLog.activityLog;
    }

    this.responseData(res, updatedTask);

    // Inform performer users.
    businesses.task.informNewPerformerUsers(task, addedPerformerUsers);
  }

  /**
   * Get task statistics by unit ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getStatisticsByUnitId(req, res) {
    // Define params.
    const unitId = req.body.unit_id;
    const groupBy = req.body.group_by;
    const options = {
      filters: req.body.filters,
      sort: req.body.sort,
    };

    // Check that user being head of unit.
    const isRequestUserUnitHead = this.isRequestUserUnitHead(req, unitId);
    if (!isRequestUserUnitHead) {
      return this.responseError(res, 'User should be unit head.', 401);
    }

    // Get statistics.
    let statistics;
    try {
      switch (groupBy) {
        case 'by_template':
          statistics = await this.taskModel.getTemplateStatisticsByUnitId(unitId, options);
          break;
        case 'by_status':
          statistics = await this.taskModel.getStatusStatisticsByUnitId(unitId, options);
          break;
      }
    } catch (error) {
      this.responseError(res, error.message, 400);
      log.save('get-task-statistics-error', { error }, 'error');
    }

    if (!statistics) return this.responseError(res, 'Tasks Not Found', 404);

    this.responseData(res, statistics);
  }

  /**
   * Get task list by unit ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getListByUnitId(req, res) {
    // Define params.
    const unitId = req.body.unit_id;
    const options = {
      filters: req.body.filters,
      sort: req.body.sort,
      page: req.body.page,
      count: req.body.count,
    };

    // Check that user being head of unit.
    const isRequestUserUnitHead = this.isRequestUserUnitHead(req, unitId);
    if (!isRequestUserUnitHead) {
      return this.responseError(res, 'User should be unit head.', 401);
    }

    // Get list.
    let list;
    try {
      list = await this.taskModel.getListByUnitId(unitId, options);
    } catch (error) {
      this.responseError(res, error.message, 400);
      log.save('get-task-list-error', { error }, 'error');
    }

    if (!list) return this.responseError(res, 'Tasks Not Found', 404);

    this.responseData(res, list);
  }

  async deleteExpiredDrafts(req, res) {
    const userId = this.getRequestUserId(req);

    // Delete expired drafts.
    let deleteTaskResponse;
    try {
      deleteTaskResponse = await businesses.task.deleteExpiredDraftsByUserId(userId);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, deleteTaskResponse);
  }

  /**
   * Get user performer tasks from other system.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getUserPerformerTasksFromOtherSystem(req, res) {
    const { userId, taskTemplateIds, isFinished, isEntry } = req.body;

    if (!userId || !taskTemplateIds || !Array.isArray(taskTemplateIds) || taskTemplateIds.length === 0) {
      return this.responseError(res, 'Params userId, taskTemplateIds are required. taskTemplateIds must be not empty array.', 400);
    }
    if ([isFinished, isEntry].some((param) => param !== undefined && typeof param !== 'boolean')) {
      return this.responseError(res, 'Params isFinished and isEntry must have boolean type.', 400);
    }

    let tasks;
    try {
      tasks = await models.task.getByPerformerUser(userId, {
        taskTemplateIds,
        isFinished,
        isEntry,
      });
    } catch (error) {
      log.save('get-tasks-by-performer-user-error', { error }, 'error');
      this.responseError(res, error.message);
    }

    let taskTemplates;
    try {
      const taskTemplatesPromises = taskTemplateIds.map((tti) => models.taskTemplate.findById(tti));
      taskTemplates = await Promise.all(taskTemplatesPromises);
    } catch (error) {
      log.save('get-tasks-by-performer-user-error', { error }, 'error');
      this.responseError(res, error.message);
    }

    const tasksWithNames = tasks.map((task) => ({
      ...task,
      name: task.name || taskTemplates.find((tt) => tt.id === task.taskTemplateId)?.name || null,
    }));

    this.responseData(res, tasksWithNames);
  }
}

module.exports = TaskController;
