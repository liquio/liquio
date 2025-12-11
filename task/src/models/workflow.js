const Sequelize = require('sequelize');
const SqlString = require('sequelize/lib/sql-string');
const _ = require('lodash');
const moment = require('moment');
const Model = require('./model');
const Entity = require('../entities/entity');
const WorkflowEntity = require('../entities/workflow');
const RedisClient = require('../lib/redis_client');

const GET_ALL_BY_USER_ID_CACHE_TTL = 600; // 10 minutes

class WorkflowModel extends Model {
  constructor() {
    if (!WorkflowModel.singleton) {
      super();

      this.model = this.db.define(
        'workflow',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          parent_id: {
            type: Sequelize.UUIDV1,
            allowNull: true,
            references: { model: 'workflows', key: 'id' }
          },
          workflow_template_id: {
            type: Sequelize.INTEGER,
            references: { model: 'workflow_templates', key: 'id' }
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
          created_by_ipn: Sequelize.STRING,
          created_by_unit_heads: Sequelize.ARRAY(Sequelize.INTEGER),
          created_by_units: Sequelize.ARRAY(Sequelize.INTEGER),
          observer_units: Sequelize.ARRAY(Sequelize.INTEGER),
          is_personal: Sequelize.BOOLEAN,
          statuses: Sequelize.JSONB
        },
        {
          tableName: 'workflows',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      this.model.paginate = this.paginate;

      WorkflowModel.singleton = this;
    }

    return WorkflowModel.singleton;
  }

  /**
   * Get all by User ID.
   * @param {string} userId User ID.
   * @param {object} options Options.
   * @returns {Promise<WorkflowEntity[]>}
   */
  async getAllByUserId(
    userId,
    { userUnitIds, currentPage, perPage, filters, sort, with: relations, onboardingWorkflowTemplateIds }
  ) {
    let sequelizeOptions = {
      currentPage,
      perPage,
      filters: {
        ..._.pick(filters, ['is_final', 'workflow_status_id']),
        [Sequelize.Op.and]: []
      }
    };

    const sequelizeOptionsAndFilter = {
      [Sequelize.Op.or]: {
        [Sequelize.Op.and]: {
          created_by: userId,
          is_personal: true
        },
      }
    };

    const defaultUnits = global.config.auth.defaultUnits || [];
    const userUnitsAll = userUnitIds.all.filter(v => !defaultUnits.includes(v));
    const userUnitsHead = userUnitIds.head.filter(v => !defaultUnits.includes(v));

    // Filter by created by units only if enabled.
    if (global.config.filters?.workflowCreatedByUnits) {
      if (userUnitsAll.length > 0) {
        sequelizeOptionsAndFilter[Sequelize.Op.or].created_by_units = { [Sequelize.Op.overlap]: userUnitsAll };
      }
      if (userUnitsHead.length > 0) {
        sequelizeOptionsAndFilter[Sequelize.Op.or].created_by_unit_heads = { [Sequelize.Op.overlap]: userUnitsHead };
      }
    }

    if (global.config.modules.main && global.config.modules.main.observerUnits && userUnitsAll.length > 0) {
      sequelizeOptionsAndFilter[Sequelize.Op.or].observer_units = { [Sequelize.Op.overlap]: userUnitsAll };
    }
    sequelizeOptions.filters[Sequelize.Op.and].push(sequelizeOptionsAndFilter);

    if (typeof filters.name !== 'undefined') {
      sequelizeOptions.filters[Sequelize.Op.and].push({
        [Sequelize.Op.or]: {
          name: {
            [Sequelize.Op.iLike]: `%${filters.name}%`
          },
          '$workflowTemplate.name$': {
            [Sequelize.Op.iLike]: `%${filters.name}%`
          },
          number: {
            [Sequelize.Op.iLike]: `%${filters.name}%`
          }
        }
      });
    }

    if (typeof filters.search !== 'undefined') {
      sequelizeOptions.filters[Sequelize.Op.and].push({
        [Sequelize.Op.or]: {
          name: {
            [Sequelize.Op.iLike]: `%${filters.search}%`
          },
          '$workflowTemplate.name$': {
            [Sequelize.Op.iLike]: `%${filters.search}%`
          },
          number: {
            [Sequelize.Op.iLike]: `%${filters.search}%`
          },
        }
      });
    }

    if (onboardingWorkflowTemplateIds) {
      sequelizeOptions.filters.workflow_template_id = {
        [Sequelize.Op.notIn]: onboardingWorkflowTemplateIds
      };
    }

    if (typeof filters.workflow_template_id !== 'undefined') {
      sequelizeOptions.filters[Sequelize.Op.and].push({
        workflow_template_id: filters.workflow_template_id
      });
    }

    sequelizeOptions.include = [
      { model: models.workflowTemplate.model, required: true, attributes: ['data'] }
    ];

    let taskModel = {
      model: models.task.model,
      required: true,
      attributes: ['id', 'is_entry', 'finished', 'finished_at', 'updated_at'],
      duplicating: false,
      where: {
        is_entry: true
      },
      include: [
        {
          model: models.document.model,
          required: true,
          attributes: ['id', 'created_at', 'updated_at', 'external_id']
        }
      ]
    };

    if (
      typeof filters['tasks'] !== 'undefined' &&
      typeof filters['tasks']['deleted'] !== 'undefined'
    ) {
      if (filters['tasks']['deleted'] === true) {
        taskModel.where['deleted'] = true;
      } else if (filters['tasks']['deleted'] === false) {
        taskModel.where['deleted'] = false;
      }
    }

    if (typeof filters['is_draft'] !== 'undefined') {
      if (filters['is_draft'] === true) {
        taskModel.where['finished_at'] = {
          [Sequelize.Op.eq]: null
        };

      } else if (filters['is_draft'] === false) {
        taskModel.where['finished_at'] = {
          [Sequelize.Op.not]: null
        };
      }
    }

    if (
      typeof filters['tasks'] !== 'undefined' &&
      typeof filters['tasks']['is_system'] !== 'undefined'
    ) {
      if (filters['tasks']['is_system'] === true) {
        taskModel.where['is_system'] = true;
      } else if (filters['tasks']['is_system'] === false) {
        taskModel.where['is_system'] = false;
      }
    } else {
      // By default hide workflows with system task. (task.is_system === true)
      taskModel.where['is_system'] = false;
    }

    sequelizeOptions.include.push(taskModel);

    if (sort.documents) {
      sequelizeOptions.sort = [
        [
          { model: global.models.task.model },
          { model: global.models.document.model },
          'updated_at',
          sort.documents['updated_at']
        ]
      ];
    } else {
      sort = this.prepareSort(sort);
      if (sort.length > 0) {
        sequelizeOptions.sort = sort;
      }
    }

    const cacheKey = RedisClient.createKey(
      'workflows', 'getAllByUserId', userId,
      { userUnitIds, currentPage, perPage, filters, sort, with: relations, onboardingWorkflowTemplateIds },
    );

    let { data: workflows } = await RedisClient.getOrSetWithTimestamp(
      cacheKey,
      () => this.getWorkflowsTimestampByUserId(userId), // Check if there's something new.
      () => this.model.paginate(sequelizeOptions),
      GET_ALL_BY_USER_ID_CACHE_TTL,
    );

    const promises = workflows.data.map(async item => {
      let workflowEntity = this.prepareEntity(item);

      workflowEntity.workflowTemplate = global.models.workflowTemplate.prepareEntity(item.workflowTemplate);

      const tasks = item.tasks.map(taskModel => global.models.task.prepareEntity(taskModel));

      const entryTask = tasks.find(v => v.isEntry === true);
      if (entryTask) {
        const entryDocument = entryTask.document;
        if (entryDocument) {
          workflowEntity.entryTask = {
            document: entryDocument
          };
        }

        workflowEntity.entryTaskId = entryTask.id;
        workflowEntity.entryTaskFinishedAt = entryTask.finishedAt;

        const lastEntryTask = tasks
          .filter(({ finished }) => finished)
          .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))
          .find(({ taskTemplateId }) => taskTemplateId === entryTask.taskTemplateId);

        workflowEntity.lastEntryTaskId = lastEntryTask?.id;
        workflowEntity.lastEntryTaskFinishedAt = lastEntryTask?.finishedAt;
      }

      const externalIds = item.tasks.map(v => v.document.external_id);

      workflowEntity.externalIds = externalIds.filter(v => !!v);

      if (relations) {
        workflowEntity = await this.getEntitiesByRelations({
          relations,
          sequelizeModel: item,
          entity: workflowEntity
        });
      }

      return workflowEntity;
    });

    workflows.data = await Promise.all(promises);

    return workflows;
  }

  /**
   * Get all.
   * @param {object} options Options.
   * @returns {Promise<WorkflowEntity[]>}
   */
  async getAll({ workflowTemplateId, fromCreatedAt, toCreatedAt, currentPage, perPage }) {
    let sequelizeOptions = {
      filters: {},
      currentPage,
      perPage,
      sort: [['created_at', 'desc']]
    };

    sequelizeOptions.include = [
      {
        model: models.workflowTemplate.model,
        required: true,
        attributes: ['id', 'workflow_template_category_id', 'name', 'description', 'data'],
        include: [{ model: models.workflowTemplateCategory.model }]
      }
    ];

    if (workflowTemplateId) {
      sequelizeOptions.filters['workflow_template_id'] = workflowTemplateId;
    }

    if (fromCreatedAt && toCreatedAt) {
      sequelizeOptions.filters['created_at'] = { [Sequelize.Op.between]: [fromCreatedAt, toCreatedAt] };
    } else if (fromCreatedAt) {
      sequelizeOptions.filters['created_at'] = { [Sequelize.Op.gte]: fromCreatedAt };
    } else if (toCreatedAt) {
      sequelizeOptions.filters['created_at'] = { [Sequelize.Op.lte]: toCreatedAt };
    }

    let workflows = await this.model.paginate(sequelizeOptions);

    const promises = workflows.data.map(async item => {
      let workflowEntity = this.prepareEntity(item);

      const workflowTemplateEntity = item.workflowTemplate.prepareEntity(item.workflowTemplate);

      workflowEntity.workflowTemplate = workflowTemplateEntity;

      if (item.workflowTemplate && item.workflowTemplate.workflowTemplateCategory) {
        const workflowTemplateCategory = item.workflowTemplate.workflowTemplateCategory;
        const workflowTemplateCategoryEntity = item.workflowTemplate.workflowTemplateCategory.prepareEntity(
          workflowTemplateCategory
        );

        workflowEntity.workflowTemplate.workflowTemplateCategory = Entity.filterResponse(
          workflowTemplateCategoryEntity,
          true
        );
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
      include: [{ model: models.workflowTemplate.model, required: true }]
    });

    if (!workflow) {
      return;
    }

    let workflowEntity = this.prepareEntity(workflow);

    workflowEntity.workflowTemplate = workflow.workflowTemplate.prepareEntity(
      workflow.workflowTemplate
    );

    if (options.with) {
      workflowEntity = await this.getEntitiesByRelations({
        relations: options.with,
        sequelizeModel: workflow,
        entity: workflowEntity
      });
    }

    return workflowEntity;
  }

  /**
   * Find ID by number.
   * @param {string} number Workflow number.
   * @returns {Promise<string>} Workflow ID.
   */
  async findIdByNumber(number) {
    // DB request.
    const workflowRaw = await this.model.findOne({ where: { number: number } });

    // Define and return workflow ID.
    const workflowId = workflowRaw && workflowRaw.id;
    return workflowId;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {number} data.workflowTemplateId Workflow template ID.
   * @param {string} data.parentId Parent ID.
   * @param {number} data.userId User ID.
   * @param {string} data.userData User data.
   * @param {string} data.data Data.
   * @param {string} data.number Generated unique number.
   * @param {string} [data.createdByIpn] Created by IPN.
   * @param {number[]} [data.createdByUnitHeads] Created by unit heads.
   * @param {number[]} [data.createdByUnits] Created by units.
   * @param {number[]} [data.observerUnits] Observer units.
   * @param {boolean} [data.isPersonal] Is personal.
   * @returns {Promise<WorkflowEntity>} Created workflow entity promise.
   */
  async create({
    id,
    workflowTemplateId,
    parentId,
    userId,
    userData,
    data,
    number,
    name,
    createdByIpn,
    createdByUnitHeads = [],
    createdByUnits = [],
    observerUnits = [],
    isPersonal = true
  }) {
    // Prepare workflow record.
    const workflow = this.prepareForModel({
      id,
      workflowTemplateId,
      parentId,
      createdBy: userId,
      updatedBy: userId,
      data,
      number,
      userData,
      name,
      createdByIpn,
      createdByUnitHeads,
      createdByUnits,
      observerUnits,
      isPersonal
    });

    // Create and return workflow.
    const createdWorkflow = await this.model.create(workflow);

    // Return created workflow.
    return this.prepareEntity(createdWorkflow);
  }

  /**
   * Set due date.
   * @param {string} id Workflow ID.
   * @param {string} dueDate Due date.
   */
  async setDueDate(id, dueDate) {
    await this.model.update({ due_date: dueDate }, { where: { id }, returning: true });
  }

  /**
   * Set name.
   * @param {string} id Workflow ID.
   * @param {string} name Workflow name.
   */
  async setName(id, name) {
    await this.model.update({ name: name }, { where: { id }, returning: true });
  }

  /**
   * Set number.
   * @param {string} id Workflow ID.
   * @param {string} name Workflow name.
   */
  async setNumber(id, number) {
    await this.model.update({ number }, { where: { id }, returning: true });
  }

  /**
   * Set createdByUnits.
   * @param {string} id Workflow ID.
   * @param {number[]} units Units.
   */
  async setCreatedByUnits(id, createdByUnits) {
    await this.model.update({ created_by_units: createdByUnits }, { where: { id }, returning: true });
  }

  /**
   * Set createdByUnitHeads.
   * @param {string} id Workflow ID.
   * @param {number[]} units Units.
   */
  async setCreatedByUnitHeads(id, createdByUnitHeads) {
    await this.model.update({ created_by_unit_heads: createdByUnitHeads }, { where: { id }, returning: true });
  }

  /**
   * Delete by ID.
   * @param {string} id ID.
   * @returns {Promise<number>}
   */
  async deleteById(id) {
    await this.model.destroy({ where: { id } });
  }

  /**
   * Get workflows by updated at.
   * @param {object} options Options.
   * @returns {Promise<object[]>}
   */
  async getWorkflowsByUpdatedAt({ date, workflowTemplateId, currentPage = 1, perPage = 15, sort }) {
    if (perPage > config.model.pagination.limitPerPage) {
      perPage = config.model.pagination.limitPerPage;
    }

    if (currentPage < 1) {
      currentPage = 1;
    }

    let orderByUpdatedAt = 'asc';
    if (sort && sort.updated_at) {
      orderByUpdatedAt = sort.updated_at;
    }

    const updatedAt = moment(date).format('YYYY-MM-DD HH:mm:ss');

    let whereClause = 'where a.updated_at >= :updatedAt';
    const replacements = { updatedAt };
    if (workflowTemplateId) {
      whereClause += ' AND workflow_template_id = :workflowTemplateId';
      replacements.workflowTemplateId = workflowTemplateId;
    }

    const count = parseInt((await this.db.query(`
      select
        count(distinct a.workflow_id)
      from (
        (select id workflow_id, updated_at from workflows)
        union all
        (select workflow_id workflow_id, updated_at from tasks)
        union all
        (select workflow_id workflow_id, updated_at from events)
        union all
        (select workflow_id workflow_id, updated_at from gateways)
      ) a
      inner join workflows as workflow on workflow.id = a.workflow_id
      ${whereClause}`,
    { replacements, plain: true, type: Sequelize.QueryTypes.SELECT }
    )).count);

    const rows = await this.db.query(`
      select
        b.updated_at,
        "workflow"."id",
        "workflow"."workflow_template_id",
        "workflow"."name",
        "workflow"."is_final",
        "workflow"."cancellation_type_id",
        "workflow"."created_by",
        "workflow"."updated_by",
        "workflow"."data",
        "workflow"."has_unresolved_errors",
        "workflow"."due_date",
        "workflow"."workflow_status_id",
        "workflow"."number",
        "workflow"."created_at",
        "workflow"."user_data",
        "workflowTemplate"."id" AS "workflowTemplate.id",
        "workflowTemplate"."workflow_template_category_id" AS "workflowTemplate.workflow_template_category_id",
        "workflowTemplate"."name" AS "workflowTemplate.name",
        "workflowTemplate"."description" AS "workflowTemplate.description",
        "workflowTemplate"."data" AS "workflowTemplate.data",
        "workflowTemplate->workflowTemplateCategory"."id" AS "workflowTemplate.workflowTemplateCategory.id",
        "workflowTemplate->workflowTemplateCategory"."parent_id" AS "workflowTemplate.workflowTemplateCategory.parent_id",
        "workflowTemplate->workflowTemplateCategory"."name" AS "workflowTemplate.workflowTemplateCategory.name",
        "workflowTemplate->workflowTemplateCategory"."created_at" AS "workflowTemplate.workflowTemplateCategory.created_at",
        "workflowTemplate->workflowTemplateCategory"."updated_at" AS "workflowTemplate.workflowTemplateCategory.updated_at"
      from (
          select
            distinct on (a.workflow_id) workflow_id,
            a.updated_at
          from (
              (select id workflow_id, updated_at from workflows)
              union all
              (select workflow_id workflow_id, updated_at from tasks)
              union all
              (select workflow_id workflow_id, updated_at from events)
              union all
              (select workflow_id workflow_id, updated_at from gateways)
          ) a
          where a.updated_at >= :updatedAt
        ) b
      inner join workflows as workflow on workflow.id = b.workflow_id
      inner join "workflow_templates" AS "workflowTemplate" ON "workflow"."workflow_template_id" = "workflowTemplate"."id"
      left outer join "workflow_template_categories" AS "workflowTemplate->workflowTemplateCategory" ON "workflowTemplate"."workflow_template_category_id" = "workflowTemplate->workflowTemplateCategory"."id"
      ${workflowTemplateId ? 'where workflow_template_id = :workflowTemplateId' : ''}
      order by b.updated_at ${SqlString.escape(orderByUpdatedAt)}
      limit :limit offset :offset`,
    {
      replacements: {
        updatedAt: updatedAt,
        workflowTemplateId,
        orderByUpdatedAt: orderByUpdatedAt,
        offset: (currentPage - 1) * perPage,
        limit: perPage
      },
      nest: true,
      type: Sequelize.QueryTypes.SELECT
    }
    );

    const workflows = {
      pagination: {
        total: count,
        perPage: perPage,
        currentPage: currentPage,
        lastPage: Math.max(Math.ceil(count / perPage), 1)
      },
      data: rows
    };

    const promises = workflows.data.map(async item => {
      let workflowEntity = this.prepareEntity(item);

      const workflowTemplateEntity = models.workflowTemplate.prepareEntity(item.workflowTemplate);

      workflowEntity.workflowTemplate = workflowTemplateEntity;

      if (item.workflowTemplate && item.workflowTemplate.workflowTemplateCategory) {
        const workflowTemplateCategory = item.workflowTemplate.workflowTemplateCategory;
        const workflowTemplateCategoryEntity = models.workflowTemplateCategory.prepareEntity(
          workflowTemplateCategory
        );

        workflowEntity.workflowTemplate.workflowTemplateCategory = Entity.filterResponse(
          workflowTemplateCategoryEntity,
          true
        );
      }

      return workflowEntity;
    });

    workflows.data = await Promise.all(promises);
    return workflows;
  }

  /**
   * Set error.
   * @param {number} id Workflow ID.
   */
  async setError(id) {
    await this.model.update({ has_unresolved_errors: true }, { where: { id } });
  }

  /**
   * Get all by template.
   * @param {number} workflowTemplateId Workflow template ID.
   * @returns {Promise<string[]>} Is exists indicator promise.
   */
  async getIdsByTemplateId(workflowTemplateId) {
    const ids = await this.model.findAll({
      where: { workflow_template_id: workflowTemplateId },
      attributes: ['id']
    });
    return ids.map(v => v.id);
  }

  /**
   * Update createdBy.
   * @param {string} createdByIpn Created by IPN.
   * @param {string} createdBy Created by.
   * @returns {Promise} Promise.
   */
  async updateCreatedBy(createdByIpn, createdBy) {
    if (createdByIpn === null || createdByIpn === 'null' || createdByIpn === 'NULL' || typeof createdByIpn === 'undefined') {
      const error = new Error('Workflow. updateCreatedBy. Internal error. Invalid user IPN');
      error.details = { createdByIpn };
      throw error;
    }

    await this.model.update(
      {
        created_by: createdBy,
        created_by_ipn: null,
      },
      { where: { created_by_ipn: createdByIpn }, returning: true }
    );
  }

  /**
   * Set setCreatedBy.
   * @param {string} id Workflow ID.
   * @param {number[]} units Units.
   */
  async setCreatedBy(id, createdBy) {
    await this.model.update({ created_by: createdBy }, { where: { id }, returning: true });
  }

  /**
   * Set status.
   * @param {number} id Workflow ID.
   * @param {number} workflowStatusId Workflow status ID.
   * @param {object} statuses Statuses.
   */
  async setStatus(id, workflowStatusId, statuses) {
    await this.model.update({ workflow_status_id: workflowStatusId, statuses }, { where: { id } });
  }

  /**
   * Obtain the latest timestamp for workflows of a user.
   * @param {*} userId User ID.
   * @returns {Promise<string>} Timestamp.
   */
  async getWorkflowsTimestampByUserId(userId) {
    const [{ wmax, emax, tmax, dmax }] = await this.db.query(
      `
        select
          max(w.updated_at) as wmax,
          max(e.updated_at) as emax,
          max(t.updated_at) as tmax,
          max(d.updated_at) as dmax
        from workflows w
        left join events e on e.workflow_id = w.id
        left join tasks t on t.workflow_id = w.id
        left join documents d on d.id = t.document_id
        where w.created_by = :userId
      `,
      {
        replacements: { userId },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    return [wmax, emax, tmax, dmax].reduce((acc, cur) => (cur > acc ? cur : acc), 0);
  }

  /**
   * Check if workflow that contains the task is finalized
   * @param {string} taskId Task ID.
   * @returns {Promise<boolean | undefined>} Is finalized promise.
   */
  async getFinalityByTaskId(taskId) {
    const [row] = await this.db.query(
      `
        select w.is_final
        from workflows w
        inner join tasks t on t.workflow_id = w.id
        where t.id = :taskId
        limit 1
      `,
      {
        replacements: { taskId },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    // Note: returns undefined if task/workflow not found.
    return row?.is_final;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowEntity}
   */
  prepareEntity(item) {
    return new WorkflowEntity({
      id: item.id,
      parentId: item.parent_id,
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
      createdByIpn: item.created_by_ipn,
      createdByUnitHeads: item.created_by_unit_heads,
      createdByUnits: item.created_by_units,
      observerUnits: item.observer_units,
      isPersonal: item.is_personal,
      statuses: item.statuses
    });
  }

  /**
   * Prepare for model.
   * @param {WorkflowEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      id: item.id,
      parent_id: item.parentId,
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
      updated_at: item.updatedAt,
      user_data: item.userData,
      has_unresolved_errors: item.hasUnresolvedErrors,
      created_by_ipn: item.createdByIpn,
      created_by_unit_heads: item.createdByUnitHeads,
      created_by_units: item.createdByUnits,
      observer_units: item.observerUnits,
      is_personal: item.isPersonal,
      statuses: item.statuses
    };
  }
}

module.exports = WorkflowModel;
