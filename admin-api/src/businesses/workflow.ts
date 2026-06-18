import { BpmnWorkflowBusiness } from './bpmn_workflow';
import { Exceptions } from '../exceptions';
import { SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT } from '../constants/unit';

// Constants.
const SEQUELIZE_CONSTRAINT_ERROR = 'SequelizeForeignKeyConstraintError';

/**
 * Workflow business.
 */
export class WorkflowBusiness {
  private static singleton: WorkflowBusiness;

  private config: any;
  private bpmnWorkflowBusiness: BpmnWorkflowBusiness;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowBusiness.singleton) {
      this.config = config;
      this.bpmnWorkflowBusiness = new BpmnWorkflowBusiness();
      WorkflowBusiness.singleton = this;
    }

    // Return singleton.
    return WorkflowBusiness.singleton;
  }

  /**
   * Create workflow template.
   * @param {WorkflowTemplateEntity} workflowTemplateEntity Workflow Template Entity.
   * @returns {Promise<WorkflowTemplateEntity>}
   */
  async create(workflowTemplateEntity) {
    if (await global.models.workflowTemplate.findById(workflowTemplateEntity.id)) {
      throw new Exceptions.COMMITED(Exceptions.COMMITED.Messages.WORKFLOW);
    }
    return await global.models.workflowTemplate.create(workflowTemplateEntity);
  }

  /**
   * Update workflow template.
   * @param {WorkflowTemplateEntity} workflowTemplateEntity Workflow Template Entity.
   * @returns {Promise<WorkflowTemplateEntity>}
   */
  async update(workflowTemplateEntity) {
    return global.models.workflowTemplate.create(workflowTemplateEntity);
  }

  /**
   * Get workflow templates.
   * @param {object} params Params.
   * @returns {Promise<WorkflowTemplateEntity[]>}
   */
  async getWorkflows(params) {
    if (
      params.unitIds &&
      Array.isArray(params.unitIds.all) &&
      params.unitIds.all.some((v) => v === WORKFLOW_SYSTEM_ADMIN_UNIT) &&
      !params.unitIds.all.some((v) => v === SYSTEM_ADMIN_UNIT)
    ) {
      params.filters.access_units = params.unitIds.all;
    }
    delete params.unitIds;

    // Handle errors errors_subscribers filter. Pass userId to find subscribed workflow templates in model.
    if (params.filters.errors_subscribers) {
      params.filters.errors_subscribers = params.userId;
    }
    delete params.userId;

    const workflowTemplates = await global.models.workflowTemplate.getAllWithPagination({
      ...params,
    });
    let workflowTemplatesDataPrepared = await Promise.all(
      workflowTemplates.data.map(async (item) => {
        const { userId, updatedAt } = (await global.models.workflowHistory.findLastByWorkflowTemplateId(item.id)) || {};
        return { ...item, updatedBy: userId, updatedAt: updatedAt || item.updatedAt };
      }),
    );

    if (params?.sort?.updated_at) {
      const updatedAt = params.sort?.updated_at.toUpperCase();
      workflowTemplatesDataPrepared = workflowTemplatesDataPrepared.sort((a, b) =>
        a.updatedAt > b.updatedAt ? (updatedAt === 'ASC' ? 1 : -1) : updatedAt === 'ASC' ? -1 : 1,
      );
    }

    return {
      ...workflowTemplates,
      data: workflowTemplatesDataPrepared,
    };
  }

  /**
   * Get workflow templates by schema search.
   * @param {object} params Params.
   * @returns {Promise<WorkflowTemplateEntity[]>}
   */
  async getWorkflowsBySchemaSearch(params) {
    if (
      params.unitIds &&
      Array.isArray(params.unitIds.all) &&
      params.unitIds.all.some((v) => v === WORKFLOW_SYSTEM_ADMIN_UNIT) &&
      !params.unitIds.all.some((v) => v === SYSTEM_ADMIN_UNIT)
    ) {
      params.filters.access_units = params.unitIds.all;
    }
    delete params.unitIds;

    if (params.options.regexAsString && params.filters.search) {
      params.filters.search = params.filters.search.replaceAll('\\\\', '\\\\\\\\');
    }

    const workflowTemplates = await global.models.workflowTemplate.getAllBySchemaSearchWithPagination({
      ...params,
    });
    return {
      ...workflowTemplates,
      data: await Promise.all(
        workflowTemplates.data.map(async (item) => {
          const { userId, updatedAt } = (await global.models.workflowHistory.findLastByWorkflowTemplateId(item.id)) || {};
          return { ...item, updatedBy: userId, updatedAt: updatedAt };
        }),
      ),
    };
  }

  /**
   * Get short workflow templates.
   * @returns {Promise<WorkflowTemplateEntity[]>}
   */
  async getShortWorkflows() {
    return global.models.workflowTemplate.getAll({
      attributes: ['id', 'name'],
    });
  }

  /**
   * Get last workflow templates.
   * @returns {Promise<WorkflowTemplateEntity[]>}
   */
  async getLastWorkflow() {
    const [lastTemaplate] = await global.models.workflowTemplate.getAll({
      attributes: ['id'],
      order: [['id', 'DESC']],
      limit: 1,
      where: {},
    });
    return lastTemaplate;
  }

  /**
   * Delete workflow template by ID.
   * @param {number} id Workflow template ID.
   * @returns {Promise<WorkflowTemplateEntity>}
   */
  async deleteById(id) {
    let bpmnWorkflow;
    try {
      bpmnWorkflow = await this.bpmnWorkflowBusiness.getBpmnWorkflowReferences(id);
    } catch (error) {
      if (error.message !== Exceptions.WORKFLOW.Messages.INVALID_XML) {
        throw error;
      }

      try {
        return await global.models.workflowTemplate.deleteById(id);
      } catch (error) {
        if (error.name === SEQUELIZE_CONSTRAINT_ERROR) {
          throw new Exceptions.WORKFLOW(Exceptions.WORKFLOW.Messages.CONSTRAINT);
        }

        throw error;
      }
    }

    const bpmnWorkflowTransaction = await global.db.transaction();

    try {
      if (typeof bpmnWorkflow === 'object' && Array.isArray(bpmnWorkflow.taskTemplates)) {
        for (const taskTemplate of bpmnWorkflow.taskTemplates) {
          await global.models.taskTemplate.deleteById(taskTemplate.id, bpmnWorkflowTransaction);
        }
      }

      if (typeof bpmnWorkflow === 'object' && Array.isArray(bpmnWorkflow.documentTemplates)) {
        for (const documentTemplate of bpmnWorkflow.documentTemplates) {
          await global.models.documentTemplate.deleteById(documentTemplate.id, bpmnWorkflowTransaction);
        }
      }

      if (typeof bpmnWorkflow === 'object' && Array.isArray(bpmnWorkflow.gatewayTemplates)) {
        for (const gatewayTemplate of bpmnWorkflow.gatewayTemplates) {
          await global.models.gatewayTemplate.deleteById(gatewayTemplate.id, bpmnWorkflowTransaction);
        }
      }

      if (typeof bpmnWorkflow === 'object' && Array.isArray(bpmnWorkflow.eventTemplates)) {
        for (const eventTemplate of bpmnWorkflow.eventTemplates) {
          await global.models.eventTemplate.deleteById(eventTemplate.id, bpmnWorkflowTransaction);
        }
      }

      if (typeof bpmnWorkflow === 'object' && typeof bpmnWorkflow.workflowTemplate !== 'undefined') {
        await global.models.workflowHistory.deleteByWorkflowTemplateId(id, bpmnWorkflowTransaction);
        await global.models.workflowTemplate.deleteById(id, bpmnWorkflowTransaction);
      }
      await bpmnWorkflowTransaction.commit();
    } catch (error) {
      await bpmnWorkflowTransaction.rollback();

      if (error.name === SEQUELIZE_CONSTRAINT_ERROR) {
        throw new Exceptions.WORKFLOW(Exceptions.WORKFLOW.Messages.CONSTRAINT);
      }

      throw error;
    }
  }

  /**
   * Find workflow template by ID.
   * @param {number} id Workflow template ID.
   * @returns {Promise<WorkflowTemplateEntity>}
   */
  async findById(id) {
    return global.models.workflowTemplate.findById(id);
  }

  /**
   * Find last workflow history by workflow ID.
   * @param {number} workflowTemplateId Workflow template ID.
   * @returns {Promise<WorkflowTemplateEntity>}
   */
  async findLastWorkflowHistoryByWorkflowTemplateId(workflowTemplateId) {
    return await global.models.workflowHistory.findLastByWorkflowTemplateId(workflowTemplateId);
  }

  /**
   * Subscribe user on workflow errors by workflow ID and user data.
   * @param {number} workflowTemplateId Workflow template ID.
   * @param {object} param Params.
   * @returns {Promise<subscribingResult>}
   */
  async subscribeOnWorkflowErrors(workflowTemplateId, { userData: { userId, email } }) {
    // Get existing errors subscribers.
    const workflowTemplate = await this.findById(workflowTemplateId);
    const { errorsSubscribers: existingErrorsSubscribers = [] } = workflowTemplate;

    // Check passed user subscribed on workflow errors.
    if (existingErrorsSubscribers.some(({ id }) => id === userId)) {
      let error = new Error('User already subscribed on workflow errors');
      (error as any).details = { workflowTemplateId, userId };
      throw error;
    }

    // Check passed email subscribed on workflow errors.
    if (existingErrorsSubscribers.some(({ email: existingUserEmail }) => existingUserEmail === email)) {
      let error = new Error('Email already subscribed on workflow errors');
      (error as any).details = { workflowTemplateId, email };
      throw error;
    }

    // Calculate new errorsSubscribers array.
    const newErrorsSubscribers = [...existingErrorsSubscribers, { id: userId, email }];

    // Set and return new errors subscribers.
    return await global.models.workflowTemplate.setErrorsSubscribers(workflowTemplateId, newErrorsSubscribers);
  }

  /**
   * Unsubscribe user from workflow errors by workflow ID and user data (contains only user ID)
   * @param {number} workflowTemplateId Workflow template ID.
   * @param {object} param Params.
   * @returns {Promise<unsubscribingResult>}
   */
  async unsubscribeFromWorkflowErrors(workflowTemplateId, { userData: { userId } }) {
    // Get existing errors subscribers.
    const workflowTemplate = await this.findById(workflowTemplateId);
    const { errorsSubscribers: existingErrorsSubscribers = [] } = workflowTemplate;

    // Check passed user subscribed on workflow errors.
    if (!existingErrorsSubscribers.some(({ id }) => id === userId)) {
      let error = new Error('User didn\'t subscribe on workflow errors. Can\'t unsubscribe.');
      (error as any).details = { workflowTemplateId, userId };
      throw error;
    }

    // Calculate new errorsSubscribers array.
    const newErrorsSubscribers = existingErrorsSubscribers.filter(({ id }) => id !== userId);

    // Set and return new errors subscribers.
    return await global.models.workflowTemplate.setErrorsSubscribers(workflowTemplateId, newErrorsSubscribers);
  }

  /**
   * Get workflow template tags.
   * @param {number} workflowTemplateId Workflow template ID.
   * @returns {Promise<WorkflowTemplateTagEntity[]>}
   */
  async getTagsByWorkflowTemplateId(workflowTemplateId) {
    return global.models.workflowTemplateTag.getAllByWorkflowTemplateId(workflowTemplateId);
  }

  /**
   * Replace workflow template tags with a new set.
   * @param {number} workflowTemplateId Workflow template ID.
   * @param {number[]} tagIds List of tag IDs.
   */
  async setWorkflowTemplateTags(workflowTemplateId, tagIds) {
    await global.models.workflowTemplateTagMap.model.destroy({ where: { workflowTemplateId } });

    return global.models.workflowTemplateTagMap.model.bulkCreate(tagIds.map((tagId) => ({ workflowTemplateId, workflowTemplateTagId: tagId })));
  }

  /**
   * Create a new workflow template tag.
   * @param {object} data Tag data.
   * @param {string} data.name Tag name.
   * @param {string} data.color Tag color.
   * @param {string} [data.description] Tag description.
   * @param {string} [data.createdBy] Tag creator.
   * @param {string} [data.updatedBy] Tag updater.
   * @returns {Promise<WorkflowTemplateTagEntity>}
   */
  async createTag(data) {
    const tag = await global.models.workflowTemplateTag.findByName(data.name);
    if (tag) {
      throw new Exceptions.WORKFLOW(Exceptions.WORKFLOW.Messages.TAG_EXISTS);
    }

    return global.models.workflowTemplateTag.create(data);
  }

  /**
   * Update an existing workflow template tag.
   * @param {number} id Tag ID.
   * @param {object} data Tag data.
   * @param {string} [data.name] Tag name.
   * @param {string} [data.color] Tag color.
   * @param {string} [data.description] Tag description.
   * @param {string} [data.updatedBy] Tag updater.
   * @returns {Promise<WorkflowTemplateTagEntity>}
   */
  async updateTag(id, data) {
    const tag = await global.models.workflowTemplateTag.findById(id);
    if (!tag) {
      throw new Exceptions.WORKFLOW(Exceptions.WORKFLOW.Messages.TAG_NOT_FOUND);
    }

    return global.models.workflowTemplateTag.update(id, data);
  }

  /**
   * Return a paginated list of tags with optional search.
   * @param {object} options Options.
   * @param {number} options.currentPage Current page.
   * @param {number} options.perPage Items per page.
   * @param {string} [options.search] Search query.
   * @returns
   */
  async getAllTags(options) {
    const { currentPage = 0, perPage = 10, short = false, search } = options;

    if (short) {
      return global.models.workflowTemplateTag.getAll(true);
    }

    return global.models.workflowTemplateTag.getAllWithPagination({
      currentPage,
      perPage,
      search,
    });
  }

  async getTagById(id) {
    return global.models.workflowTemplateTag.findById(id);
  }

  async deleteTag(id) {
    return global.models.workflowTemplateTag.deleteById(id);
  }
}
