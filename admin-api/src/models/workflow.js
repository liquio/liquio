const Sequelize = require('sequelize');
const SqlString = require('sequelize/lib/sql-string');
const moment = require('moment');
const _ = require('lodash');
const Model = require('./model');
const Entity = require('../entities/entity');
const WorkflowEntity = require('../entities/workflow');

class WorkflowModel extends Model {
  constructor(dbInstance) {
    if (!WorkflowModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'workflow',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          workflow_template_id: {
            type: Sequelize.INTEGER,
            references: { model: 'workflow_templates', key: 'id' },
          },
          name: Sequelize.STRING,
          is_final: Sequelize.BOOLEAN,
          cancellation_type_id: Sequelize.INTEGER,
          created_by: Sequelize.STRING,
          updated_by: Sequelize.STRING,
          data: Sequelize.JSON,
          due_date: Sequelize.DATE,
          workflow_status_id: Sequelize.INTEGER,
          number: Sequelize.STRING,
          created_at: Sequelize.DATE,
          user_data: Sequelize.JSON,
          has_unresolved_errors: Sequelize.BOOLEAN,
          statuses: Sequelize.JSONB,
        },
        {
          tableName: 'workflows',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;
      this.model.paginate = this.paginate;

      WorkflowModel.singleton = this;
    }

    return WorkflowModel.singleton;
  }

  /**
   * Get all.
   * @param {object} options Options.
   * @returns {Promise<WorkflowEntity[]>}
   */
  async getAll({ currentPage, perPage, attributes, filters, sort, extended = false, briefInfo = false }) {
    let sequelizeOptions = {
      currentPage,
      perPage,
      attributes,
      filters: {
        ..._.pick(filters, [
          'id',
          'workflow_template_id',
          'is_final',
          'created_by',
          'workflow_status_id',
          'has_errors',
          'has_unresolved_errors',
          'number',
          'is_draft',
          'is_not_draft',
        ]),
      },
    };

    const fromCreatedAt =
      filters.from_created_at && moment(filters.from_created_at).isValid() ? moment(filters.from_created_at).format('YYYY-MM-DD HH:mm:ss') : null;

    const toCreatedAt =
      filters.to_created_at && moment(filters.to_created_at).isValid() ? moment(filters.to_created_at).format('YYYY-MM-DD HH:mm:ss') : null;

    const fromUpdatedAt =
      filters.from_updated_at && moment(filters.from_updated_at).isValid() ? moment(filters.from_updated_at).format('YYYY-MM-DD HH:mm:ss') : null;

    const toUpdatedAt =
      filters.to_updated_at && moment(filters.to_updated_at).isValid() ? moment(filters.to_updated_at).format('YYYY-MM-DD HH:mm:ss') : null;

    if (fromCreatedAt && toCreatedAt) {
      sequelizeOptions.filters['workflow.created_at'] = Sequelize.where(Sequelize.col('workflow.created_at'), {
        [Sequelize.Op.between]: [fromCreatedAt, toCreatedAt],
      });
    } else if (fromCreatedAt) {
      sequelizeOptions.filters['workflow.created_at'] = Sequelize.where(Sequelize.col('workflow.created_at'), {
        [Sequelize.Op.gte]: fromCreatedAt,
      });
    } else if (toCreatedAt) {
      sequelizeOptions.filters['workflow.created_at'] = Sequelize.where(Sequelize.col('workflow.created_at'), {
        [Sequelize.Op.lte]: toCreatedAt,
      });
    }

    if (fromUpdatedAt && toUpdatedAt) {
      sequelizeOptions.filters['workflow.updated_at'] = Sequelize.where(Sequelize.col('workflow.updated_at'), {
        [Sequelize.Op.between]: [fromUpdatedAt, toUpdatedAt],
      });
    } else if (fromUpdatedAt) {
      sequelizeOptions.filters['workflow.updated_at'] = Sequelize.where(Sequelize.col('workflow.updated_at'), {
        [Sequelize.Op.gte]: fromUpdatedAt,
      });
    } else if (toUpdatedAt) {
      sequelizeOptions.filters['workflow.updated_at'] = Sequelize.where(Sequelize.col('workflow.updated_at'), {
        [Sequelize.Op.lte]: toUpdatedAt,
      });
    }

    if (filters.task_template_id) {
      sequelizeOptions.filters[Sequelize.Op.and] = [
        Sequelize.literal(
          'exists (select id from tasks t where t.workflow_id = workflow.id and t.task_template_id = :taskTemplateId)',
          { taskTemplateId: parseInt(filters.task_template_id) },
        ),
      ];
    }

    if (filters.event_template_id) {
      sequelizeOptions.filters[Sequelize.Op.and] = [
        Sequelize.literal(
          'exists (select id from events e where e.workflow_id = workflow.id and e.event_template_id = :eventTemplateId)',
          { eventTemplateId: parseInt(filters.event_template_id) },
        ),
      ];
    }

    if (filters.gateway_template_id) {
      sequelizeOptions.filters[Sequelize.Op.and] = [
        Sequelize.literal(
          'exists (select id from gateways g where g.workflow_id = workflow.id and g.gateway_template_id = :gatewayTemplateId)',
          { gatewayTemplateId: parseInt(filters.gateway_template_id) },
        ),
      ];
    }

    if (typeof filters.name !== 'undefined') {
      sequelizeOptions.filters[Sequelize.Op.or] = {
        name: {
          [Sequelize.Op.iLike]: `%${filters.name}%`,
        },
        '$workflowTemplate.name$': {
          [Sequelize.Op.iLike]: `%${filters.name}%`,
        },
      };
    }

    if (typeof filters.is_draft !== 'undefined') {
      sequelizeOptions.filters[Sequelize.Op.and] = [Sequelize.literal('workflow.data -> \'messages\' is null')];
      delete sequelizeOptions.filters['is_draft'];
    }

    if (typeof filters.is_not_draft !== 'undefined') {
      sequelizeOptions.filters[Sequelize.Op.and] = [Sequelize.literal('workflow.data -> \'messages\' is not null')];
      delete sequelizeOptions.filters['is_not_draft'];
    }

    if (filters.user_data) {
      sequelizeOptions.filters[Sequelize.Op.and] = [Sequelize.literal(`workflow.user_data#>>'{userId}' = ${SqlString.escape(filters.user_data)}`)];
    }

    sequelizeOptions.include = [
      { model: models.workflowTemplate.model, required: true, include: [{ model: models.workflowTemplateCategory.model }] },
    ];

    if (extended) {
      sequelizeOptions.distinct = true;
      let whereWorkflowError = {};

      let requiredJoinWorkflowError = false;
      if (filters['has_errors'] === true) {
        requiredJoinWorkflowError = true;
      }

      if (filters['has_errors'] === false) {
        sequelizeOptions.filters['$workflowErrors.id$'] = null;
      }

      sequelizeOptions.include.push({
        attributes: ['service_name', 'created_at'],
        model: models.workflowError.model,
        required: requiredJoinWorkflowError,
        duplicating: filters['has_errors'] === false ? false : true,
        where: whereWorkflowError,
      });
    }

    if (briefInfo) {
      sequelizeOptions.include.map((item) => {
        item.attributes = [];
        return item;
      });
    }

    delete sequelizeOptions.filters['has_errors'];

    sort = this.prepareSort(sort);
    if (sort.length > 0) {
      sequelizeOptions.sort = sort;
    }

    sequelizeOptions.maxLimit = true;

    let workflows = await this.model.paginate(sequelizeOptions, { briefInfo });

    const promises = workflows.data.map(async (item) => {
      let workflowEntity = this.prepareEntity(item);

      if (item.workflowErrors) {
        workflowEntity.workflowErrors = [];
        item.workflowErrors.map((workflowError) => {
          workflowEntity.workflowErrors.push(workflowError.prepareEntity(workflowError));
        });
      }

      const workflowTemplateEntity = item.workflowTemplate?.prepareEntity(item.workflowTemplate);

      workflowEntity.workflowTemplate = workflowTemplateEntity && Entity.filterResponse(workflowTemplateEntity, true);

      if (item.workflowTemplate && item.workflowTemplate.workflowTemplateCategory) {
        const workflowTemplateCategory = item.workflowTemplate.workflowTemplateCategory;
        const workflowTemplateCategoryEntity = item.workflowTemplate.workflowTemplateCategory.prepareEntity(workflowTemplateCategory);

        workflowEntity.workflowTemplate.workflowTemplateCategory = Entity.filterResponse(workflowTemplateCategoryEntity, true);
      }

      return workflowEntity;
    });

    workflows.data = await Promise.all(promises);

    return workflows;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @param {object} [options] Options.
   * @returns {Promise<WorkflowEntity>}
   */
  async findById(id, options = {}) {
    const workflow = await this.model.findByPk(id, {
      include: [{ model: models.workflowTemplate.model, required: true }],
    });

    if (!workflow) {
      return;
    }

    let workflowEntity = this.prepareEntity(workflow);

    workflowEntity.workflowTemplate = workflow.workflowTemplate.prepareEntity(workflow.workflowTemplate);

    if (options.with) {
      workflowEntity = await this.getEntitiesByRelations({
        relations: options.with,
        sequelizeModel: workflow,
        entity: workflowEntity,
      });
    }

    return workflowEntity;
  }

  /**
   * Update.
   * @param {number} id Workflow ID.
   * @param {object} data Data.
   * @returns {Promise<WorkflowEntity>}
   */
  async update(id, data) {
    const workflow = this.prepareForModel(data);

    const [, updatedWorkflow] = await this.model.update(workflow, { where: { id: id }, returning: true });
    if (updatedWorkflow.length === 1) {
      return this.prepareEntity(updatedWorkflow[0]);
    }
  }

  /**
   * Update data.
   * @param {number} id Workflow ID.
   * @param {object} data Data.
   * @returns {Promise<WorkflowEntity>}
   */
  async updateData(id, data) {
    const workflow = this.prepareForModel({ data });

    const [, updatedWorkflow] = await this.model.update(workflow, { where: { id: id }, returning: true });
    if (updatedWorkflow.length === 1) {
      return this.prepareEntity(updatedWorkflow[0]);
    }
  }

  /**
   * Set status final.
   * @param {number} id Workflow ID.
   * @param {boolean} isFinal Is final.
   */
  async setStatusFinal(id, isFinal = true) {
    await this.model.update({ is_final: isFinal }, { where: { id } });
  }

  /**
   * Set status.
   * @param {number} id Workflow ID.
   * @param {number} workflowStatusId Workflow status ID.
   */
  async setStatus(id, workflowStatusId) {
    await this.model.update({ workflow_status_id: workflowStatusId }, { where: { id } });
  }

  /**
   * Set error.
   * @param {number} id Workflow ID.
   */
  async setError(id) {
    await this.model.update({ has_unresolved_errors: true }, { where: { id } });
  }

  /**
   * Resolve error.
   * @param {number} id Workflow ID.
   */
  async resolveError(id) {
    await this.model.update({ has_unresolved_errors: false }, { where: { id } });
  }

  /**
   * Get workflow IDs list.
   * @param {object} filters Filters.
   * @param {string} [filters.fromCreatedAt] From created at.
   * @param {string} [filters.toCreatedAt] To created at.
   * @param {string} [filters.fromUpdatedAt] From updated at.
   * @param {string} [filters.toUpdatedAt] To updated at.
   * @returns {Promise<string[]>} Workflow IDs list.
   */
  async getWorkflowIdsList({ fromCreatedAt, toCreatedAt, fromUpdatedAt, toUpdatedAt }) {
    // Define filters.
    const where = {};
    if (fromCreatedAt) {
      where.created_at = {
        [Sequelize.Op.gte]: fromCreatedAt,
      };
    }
    if (toCreatedAt) {
      where.created_at = {
        ...(where.created_at || {}),
        [Sequelize.Op.lte]: toCreatedAt,
      };
    }
    if (fromUpdatedAt) {
      where.updated_at = {
        [Sequelize.Op.gte]: fromUpdatedAt,
      };
    }
    if (toUpdatedAt) {
      where.updated_at = {
        ...(where.updated_at || {}),
        [Sequelize.Op.lte]: toUpdatedAt,
      };
    }

    // Get workflow IDs.
    const workflows = await this.model.findAll({
      attributes: ['id'],
      where,
    });

    // Return workflow IDs.
    return workflows.map((workflow) => workflow.id);
  }

  async getAllByWorkflowIds(workflowIds) {
    let sequelizeOptions = {
      where: { id: { [Sequelize.Op.in]: workflowIds } },
    };

    sequelizeOptions.include = [
      {
        model: models.workflowTemplate.model,
        include: [{ model: models.workflowTemplateCategory.model }],
        required: true,
      },
      {
        model: models.workflowError.model,
        attributes: ['service_name', 'created_at'],
        required: false,
      },
    ];

    const workflows = await this.model.findAll(sequelizeOptions);

    const workflowsWithDataPromises = workflows.map(async (item) => {
      let workflowEntity = this.prepareEntity(item);
      if (item.workflowErrors) {
        workflowEntity.workflowErrors = [];
        item.workflowErrors.map((workflowError) => {
          workflowEntity.workflowErrors.push(workflowError.prepareEntity(workflowError));
        });
      }

      const workflowTemplateEntity = item.workflowTemplate?.prepareEntity(item.workflowTemplate);
      workflowEntity.workflowTemplate = workflowTemplateEntity && Entity.filterResponse(workflowTemplateEntity, true);
      if (item.workflowTemplate && item.workflowTemplate.workflowTemplateCategory) {
        const workflowTemplateCategory = item.workflowTemplate.workflowTemplateCategory;
        const workflowTemplateCategoryEntity = item.workflowTemplate.workflowTemplateCategory.prepareEntity(workflowTemplateCategory);
        workflowEntity.workflowTemplate.workflowTemplateCategory = Entity.filterResponse(workflowTemplateCategoryEntity, true);
      }

      return workflowEntity;
    });

    return await Promise.all(workflowsWithDataPromises);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowEntity}
   */
  prepareEntity(item) {
    return new WorkflowEntity({
      id: item.id,
      workflowTemplateId: item.workflow_template_id,
      name: item.name,
      isFinal: item.is_final,
      cancellationTypeId: item.cancellation_type_id,
      createdBy: item.created_by,
      updatedBy: item.updated_by,
      data: item.data,
      dueDate: item.due_date,
      workflowStatusId: item.workflow_status_id,
      number: item.number,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      userData: item.user_data,
      hasUnresolvedErrors: item.has_unresolved_errors,
      statuses: item.statuses,
    });
  }

  /**
   * Prepare for model.
   * @param {WorkflowEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      workflow_template_id: item.workflowTemplateId,
      name: item.name,
      is_final: item.isFinal,
      cancellation_type_id: item.cancellationTypeId,
      created_by: item.createdBy,
      updated_by: item.updatedBy,
      data: item.data,
      due_date: item.dueDate,
      workflow_status_id: item.workflowStatusId,
      number: item.number,
      created_at: item.createdAt,
      user_data: item.userData,
      has_unresolved_errors: item.hasUnresolvedErrors,
    };
  }
}

module.exports = WorkflowModel;
