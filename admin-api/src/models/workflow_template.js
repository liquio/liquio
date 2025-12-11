const Sequelize = require('sequelize');
const SqlString = require('sequelize/lib/sql-string');
const _ = require('lodash');

const Model = require('./model');
const WorkflowTemplateEntity = require('../entities/workflow_template');

class WorkflowTemplateModel extends Model {
  constructor(dbInstance) {
    if (!WorkflowTemplateModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'workflowTemplate',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          workflow_template_category_id: {
            type: Sequelize.INTEGER,
            references: { model: 'document_template_categories', key: 'id' },
          },
          name: Sequelize.STRING,
          description: Sequelize.STRING,
          xml_bpmn_schema: Sequelize.TEXT,
          data: Sequelize.JSON,
          is_active: Sequelize.BOOLEAN,
          access_units: {
            type: Sequelize.ARRAY(Sequelize.INTEGER),
            allowNull: false,
            defaultValue: [],
          },
          errors_subscribers: {
            allowNull: false,
            type: Sequelize.ARRAY(Sequelize.JSONB),
            defaultValue: [],
          },
        },
        {
          tableName: 'workflow_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;
      this.model.paginate = this.paginate;

      WorkflowTemplateModel.singleton = this;
    }

    return WorkflowTemplateModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<WorkflowTemplateEntity>}
   */
  async findById(id) {
    const workflowTemplate = await this.model.findByPk(id);

    return this.prepareEntity(workflowTemplate);
  }

  /**
   * Get all.
   * @returns {Promise<WorkflowTemplateEntity[]>}
   */
  async getAll(additionalOptions) {
    const options = { where: { is_active: true }, ...additionalOptions };
    const workflowTemplates = await this.model.findAll(options);

    return workflowTemplates.map((item) => this.prepareEntity(item));
  }

  /**
   * Get all with pagination.
   * @returns {Promise<WorkflowTemplateEntity[]>}
   */
  async getAllWithPagination({ currentPage, perPage, filters, sort }) {
    let sequelizeOptions = {
      currentPage,
      perPage,
      filters: {
        ..._.pick(filters, ['id', 'workflow_template_category_id']),
      },
      sort: [],
      attributes: {
        include: [[global.models.getModel('workflowTemplateTag').formAggregationSubquery(), 'tags']],
      },
      include: [{ model: global.models.getModel('workflowTemplateCategory') }],
    };

    if (typeof filters.name !== 'undefined') {
      sequelizeOptions.filters[Sequelize.Op.or] = {
        name: {
          [Sequelize.Op.iLike]: `%${filters.name}%`,
        },
        '$workflowTemplateCategory.name$': {
          [Sequelize.Op.iLike]: `%${filters.name}%`,
        },
      };

      // If the name search filter is an integer, try to treat it as a workflowTemplateId.
      const id = Number(filters.name);
      if (Number.isInteger(id)) {
        sequelizeOptions.filters[Sequelize.Op.or].id = id;
      }
    }
    sequelizeOptions.filters[Sequelize.Op.and] = [];

    if (typeof filters.exclude_workflow_template_category_id !== 'undefined') {
      sequelizeOptions.filters[Sequelize.Op.and].push({
        workflow_template_category_id: {
          [Sequelize.Op.or]: [{ [Sequelize.Op.ne]: filters.exclude_workflow_template_category_id }, { [Sequelize.Op.eq]: null }],
        },
      });
    }

    if (Array.isArray(filters.tags)) {
      sequelizeOptions.filters[Sequelize.Op.and] = [global.models.getModel('workflowTemplateTag').formFilterSubquery(filters.tags.map(Number))];
    }

    if (Array.isArray(filters.access_units)) {
      sequelizeOptions.filters[Sequelize.Op.and].push({
        access_units: { [Sequelize.Op.overlap]: filters.access_units },
      });
    }

    sort = this.prepareSort(sort);
    if (sort.length > 0) {
      sequelizeOptions.sort = sort;
    }

    if (filters.errors_subscribers) {
      sequelizeOptions.filters[Sequelize.Op.and].push(
        Sequelize.literal(`array_to_string(errors_subscribers, '||') ilike '%${SqlString.escape(filters.errors_subscribers).replace(/'/g, '')}%'`),
      );
    }
    const workflowTemplates = await this.model.paginate(sequelizeOptions);

    const promises = workflowTemplates.data.map(async (item) => {
      let workflowTemplateEntity = this.prepareEntity(item);

      if (item.workflowTemplateCategory) {
        workflowTemplateEntity.workflowTemplateCategory = item.workflowTemplateCategory.prepareEntity(item.workflowTemplateCategory);
      }

      if (item.get('tags')) {
        workflowTemplateEntity.tags = item.get('tags');
      }

      return workflowTemplateEntity;
    });

    workflowTemplates.data = await Promise.all(promises);

    return workflowTemplates;
  }

  /**
   * Get all by schema search with pagination.
   * @returns {Promise<WorkflowTemplateEntity[]>}
   */
  async getAllBySchemaSearchWithPagination({ currentPage, perPage, filters }) {
    const countQuery = `
      SELECT COUNT(1)
      FROM (
      SELECT wt_2.*,
             et.id AS event_id,
             et.name AS event_name,
             et.json_schema AS event_json_schema,
             dt.id AS document_id,
             dt.name AS document_name,
             dt.json_schema AS document_json_schema,
             dt.additional_data_to_sign AS document_additional_data_to_sign,
             tt.id AS task_id,
             tt.name AS task_name,
             tt.json_schema AS task_json_schema,
             gt.id AS gateway_id,
             gt.name AS gateway_name,
             gt.json_schema AS gateway_json_schema
      FROM
        (SELECT *,
                (split_part((regexp_matches(xml_bpmn_schema, 'id="(event-\\d*.?)"', 'gm'))[1], '-', 2)) AS event_template_id,
                (split_part((regexp_matches(xml_bpmn_schema, 'id="(task-\\d*.?)"', 'gm'))[1], '-', 2)) AS task_template_id,
                (split_part((regexp_matches(xml_bpmn_schema, 'id="(gateway-\\d*.?)"', 'gm'))[1], '-', 2)) AS gateway_template_id
         FROM workflow_templates wt
        ) wt_2
      LEFT JOIN event_templates et ON et.id::TEXT = wt_2.event_template_id
      LEFT JOIN document_templates dt ON dt.id::TEXT = wt_2.task_template_id
      LEFT JOIN task_templates tt ON tt.id::TEXT = wt_2.task_template_id
      LEFT JOIN gateway_templates gt ON gt.id::TEXT = wt_2.gateway_template_id
      WHERE et.json_schema ILIKE :searchLike
         OR dt.json_schema ILIKE :searchLike
         OR tt.json_schema ILIKE :searchLike
         OR gt.json_schema ILIKE :searchLike
         OR dt.additional_data_to_sign ILIKE :searchLike
      ORDER BY wt_2.id
      ) wt_3;      
    `;

    const selectQuery = `
      SELECT 
      wt_3.*,
      CASE WHEN wt_3.event_json_schema ILIKE :searchLike THEN concat('Event ', wt_3.event_id, ' ', wt_3.event_name, ' ...', substring(wt_3.event_json_schema, (POSITION(LOWER(:searchValue) IN LOWER(wt_3.event_json_schema)) -20), length(:searchValue) +40), '...') END AS matched_event_json_schema,
      CASE WHEN wt_3.document_json_schema ILIKE :searchLike THEN concat('Document ', wt_3.document_id, ' ', wt_3.document_name, ' ...', substring(wt_3.document_json_schema, (POSITION(LOWER(:searchValue) IN LOWER(wt_3.document_json_schema)) -20), length(:searchValue) +40), '...') END AS matched_document_json_schema,
      CASE WHEN wt_3.document_additional_data_to_sign ILIKE :searchLike THEN concat('Document ', wt_3.document_id, ' ', wt_3.document_name, ' ...', substring(wt_3.document_additional_data_to_sign, (POSITION(LOWER(:searchValue) IN LOWER(wt_3.document_additional_data_to_sign)) -20), length(:searchValue) +40), '...') END AS matched_document_additional_data_to_sign,
      CASE WHEN wt_3.task_json_schema ILIKE :searchLike THEN concat('Task ', wt_3.task_id, ' ', wt_3.task_name, ' ...', substring(wt_3.task_json_schema, (POSITION(LOWER(:searchValue) IN LOWER(wt_3.task_json_schema)) -20), length(:searchValue) +40), '...') END AS matched_task_json_schema,
      CASE WHEN wt_3.gateway_json_schema ILIKE :searchLike THEN concat('Document ', wt_3.gateway_id, ' ', wt_3.gateway_name, ' ...', substring(wt_3.gateway_json_schema, (POSITION(LOWER(:searchValue) IN LOWER(wt_3.gateway_json_schema)) -20), length(:searchValue) +40), '...') END AS matched_gateway_json_schema
      FROM (
      SELECT wt_2.*,
             et.id AS event_id,
             et.name AS event_name,
             et.json_schema AS event_json_schema,
             dt.id AS document_id,
             dt.name AS document_name,
             dt.json_schema AS document_json_schema,
             dt.additional_data_to_sign AS document_additional_data_to_sign,
             tt.id AS task_id,
             tt.name AS task_name,
             tt.json_schema AS task_json_schema,
             gt.id AS gateway_id,
             gt.name AS gateway_name,
             gt.json_schema AS gateway_json_schema
      FROM
        (SELECT *,
                (split_part((regexp_matches(xml_bpmn_schema, 'id="(event-\\d*.?)"', 'gm'))[1], '-', 2)) AS event_template_id,
                (split_part((regexp_matches(xml_bpmn_schema, 'id="(task-\\d*.?)"', 'gm'))[1], '-', 2)) AS task_template_id,
                (split_part((regexp_matches(xml_bpmn_schema, 'id="(gateway-\\d*.?)"', 'gm'))[1], '-', 2)) AS gateway_template_id
         FROM workflow_templates wt
        ) wt_2
      LEFT JOIN event_templates et ON et.id::TEXT = wt_2.event_template_id
      LEFT JOIN document_templates dt ON dt.id::TEXT = wt_2.task_template_id
      LEFT JOIN task_templates tt ON tt.id::TEXT = wt_2.task_template_id
      LEFT JOIN gateway_templates gt ON gt.id::TEXT = wt_2.gateway_template_id
      WHERE et.json_schema ILIKE :searchLike
         OR dt.json_schema ILIKE :searchLike
         OR tt.json_schema ILIKE :searchLike
         OR gt.json_schema ILIKE :searchLike
         OR dt.additional_data_to_sign ILIKE :searchLike
      ORDER BY wt_2.id
      LIMIT :limit
      OFFSET :offset
      ) wt_3;    
    `;

    const replacements = {
      searchValue: filters.search,
      searchLike: `%${filters.search}%`,
      offset: (currentPage - 1) * perPage,
      limit: perPage,
    };

    let result;
    try {
      result = await Promise.all([
        this.db.query(countQuery, { replacements: replacements }),
        this.db.query(selectQuery, { replacements: replacements }),
      ]);
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    const [[[{ count }]], [rows]] = result;

    const promises = rows.map(async (item) => {
      let workflowTemplateEntity = this.prepareEntity(item);

      if (item.workflowTemplateCategory) {
        workflowTemplateEntity.workflowTemplateCategory = item.workflowTemplateCategory.prepareEntity(item.workflowTemplateCategory);
      }

      return workflowTemplateEntity;
    });

    return {
      pagination: this.formPagination(count, currentPage, perPage),
      data: await Promise.all(promises),
    };
  }

  /**
   * Create workflow template.
   * @param {WorkflowTemplateEntity} workflowTemplateEntity Workflow template entity.
   * @param {any} [transaction] Transaction.
   * @returns {Promise<WorkflowTemplateEntity>}
   */
  async create(workflowTemplateEntity, transaction) {
    if (!(workflowTemplateEntity instanceof WorkflowTemplateEntity)) {
      throw new Error('Must be instance of WorkflowTemplateEntity');
    }

    const params = {
      returning: true,
      ...(transaction && { transaction }),
    };

    const [data] = await this.model.upsert(this.prepareForModel(workflowTemplateEntity), params);

    return this.prepareEntity(data);
  }

  /**
   * Delete by ID.
   * @param {number} id ID.
   * @param {any} transaction Transaction.
   * @returns {Promise<number}
   */
  async deleteById(id, transaction) {
    return await this.model.destroy({
      where: { id },
      transaction,
    });
  }

  async setErrorsSubscribers(workflowTemplateId, newErrorsSubscribers) {
    // Try to update record. Set errorsSubscribers.
    let updatingResult;
    try {
      updatingResult = await this.model.update(
        { errors_subscribers: newErrorsSubscribers },
        {
          where: { id: workflowTemplateId },
          attributes: ['id', 'errors_subscribers'],
          returning: true,
        },
      );
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    // Get updatedRows.
    const [, updatedRows] = updatingResult;

    // Check updated row.
    if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
      throw new Error('Can\'t update workflow template');
    }

    // Get needed data to response.
    const { id, errorsSubscribers } = this.prepareEntity(updatedRows[0]);
    return { workflowTemplateId: id, errorsSubscribers };
  }

  /**
   * Delete by ID.
   * @param {number} id ID.
   * @param {any} transaction Transaction.
   * @returns {Promise<number}
   */
  async getLatest() {
    return (
      await this.getAll({
        attributes: ['id'],
        order: [['id', 'DESC']],
        limit: 1,
        where: {},
      })
    )[0];
  }

  async setUpdatedAt(id, updatedAt, transaction) {
    let updatingResult;
    try {
      updatingResult = await this.db.query('UPDATE workflow_templates SET updated_at = :updatedAt WHERE id = :id RETURNING *', {
        replacements: { updatedAt, id },
        transaction,
      });
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }
    return this.prepareEntity(updatingResult?.[0]?.[0]);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowTemplateEntity}
   */
  prepareEntity(item) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    return new WorkflowTemplateEntity({
      id: item.id,
      workflowTemplateCategoryId: item.workflow_template_category_id,
      name: item.name,
      description: item.description,
      xmlBpmnSchema: item.xml_bpmn_schema,
      data: item.data,
      isActive: item.is_active,
      accessUnits: item.access_units,
      errorsSubscribers: item.errors_subscribers,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      meta: {
        matchedEventJsonSchema: item.matched_event_json_schema,
        matchedDocumentJsonSchema: item.matched_document_json_schema,
        matchedDocumentAdditionalDataToSign: item.matched_document_additional_data_to_sign,
        matchedTaskJsonSchema: item.matched_task_json_schema,
        matchedGatewayJsonSchema: item.matched_gateway_json_schema,
      },
    });
  }

  /**
   * Prepare for model.
   * @param {WorkflowTemplateEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      id: item.id,
      workflow_template_category_id: item.workflowTemplateCategoryId,
      name: item.name,
      description: item.description,
      xml_bpmn_schema: item.xmlBpmnSchema,
      data: item.data,
      is_active: item.isActive,
      access_units: item.accessUnits,
      errors_subscribers: item.errorsSubscribers,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

module.exports = WorkflowTemplateModel;
