const Sequelize = require('sequelize');

const Model = require('./model');
const WorkflowTemplateTagEntity = require('../entities/workflow_template_tag');

class WorkflowTemplateTagModel extends Model {
  constructor(dbInstance) {
    if (!WorkflowTemplateTagModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'workflowTemplateTag',
        {
          name: Sequelize.STRING,
          color: Sequelize.STRING,
          description: Sequelize.TEXT,
          created_by: {
            type: Sequelize.TEXT,
            allowNull: false,
            defaultValue: 'system',
          },
          updated_by: {
            type: Sequelize.TEXT,
            allowNull: false,
            defaultValue: 'system',
          },
        },
        {
          tableName: 'workflow_template_tags',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;
      this.model.paginate = this.paginate;
      this.model.formAggregationSubquery = this.formAggregationSubquery;
      this.model.formFilterSubquery = this.formFilterSubquery;

      WorkflowTemplateTagModel.singleton = this;
    }

    return WorkflowTemplateTagModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<WorkflowTemplateTagEntity>}
   */
  async findById(id) {
    const workflowTemplateTag = await this.model.findByPk(id);

    return this.prepareEntity(workflowTemplateTag);
  }

  /**
   * Find by name.
   * @param {string} name
   * @returns {Promise<WorkflowTemplateTagEntity>}
   */
  async findByName(name) {
    const workflowTemplateTag = await this.model.findOne({
      where: { name },
    });

    return this.prepareEntity(workflowTemplateTag);
  }

  /**
   * List all tags that belong to a workflow template.
   * @param {number} workflowTemplateId Workflow template ID.
   * @returns {Promise<WorkflowTemplateTagEntity[]>}
   */
  async getAllByWorkflowTemplateId(workflowTemplateId) {
    const tags = await this.model.findAll({
      include: [
        {
          model: global.models.getModel('workflowTemplate'),
          through: global.models.getModel('workflowTemplateTagMap'),
          as: 'workflowTemplates',
        },
      ],
      where: {
        '$workflowTemplates.id$': workflowTemplateId,
      },
    });

    const tagEntities = tags.map((item) => {
      return this.prepareEntity(item);
    });

    return tagEntities;
  }

  /**
   * Get all.
   * @param {boolean} [short] Short output version.
   * @returns {Promise<WorkflowTemplateTagEntity[]>}
   */
  async getAll(short = false) {
    const options = {};
    if (short) {
      options.attributes = ['id', 'name', 'color', 'description'];
      options.order = ['name'];
    }

    const workflowTemplateTags = await this.model.findAll(options);

    const workflowTemplateTagEntities = workflowTemplateTags.map((item) => {
      return this.prepareEntity(item);
    });

    return workflowTemplateTagEntities;
  }

  /**
   * Get all with pagination.
   * @returns {Promise<WorkflowTemplateTagEntity[]>}
   */
  async getAllWithPagination({ currentPage, perPage, search }) {
    let sequelizeOptions = {
      currentPage,
      perPage,
      filters: {},
      sort: [],
    };

    if (search) {
      sequelizeOptions.filters = {
        [Sequelize.Op.or]: [
          {
            name: { [Sequelize.Op.iLike]: `%${search}%` },
          },
          !isNaN(search) ? { id: parseInt(search, 10) } : null,
        ],
      };
    }

    const workflowTemplateTagEntities = await this.model.paginate(sequelizeOptions);

    workflowTemplateTagEntities.data = workflowTemplateTagEntities.data.map((item) => this.prepareEntity(item));

    return workflowTemplateTagEntities;
  }

  /**
   * Create workflow template tag.
   * @param {WorkflowTemplateTagEntity} workflowTemplateTagEntity Workflow template tag entity.
   * @param {any} transaction Transaction.
   * @returns {Promise<WorkflowTemplateTagEntity>}
   */
  async create(workflowTemplateTagEntity, transaction) {
    if (!(workflowTemplateTagEntity instanceof WorkflowTemplateTagEntity)) {
      workflowTemplateTagEntity = new WorkflowTemplateTagEntity(workflowTemplateTagEntity);
    }

    const [data] = await this.model.upsert(this.prepareForModel(workflowTemplateTagEntity), { returning: true, transaction });

    return this.prepareEntity(data);
  }

  /**
   * Update workflow template tag.
   * @param {number} id Tag ID.
   * @param {object} data Data to update.
   * @param {object} [transaction] Transaction.
   * @returns {Promise<WorkflowTemplateTagEntity>}
   */
  async update(id, data, transaction) {
    const [rowsCount, [row]] = await this.model.update(this.prepareForModel(data), {
      where: { id },
      returning: true,
      transaction,
    });

    return rowsCount ? this.prepareEntity(row) : null;
  }

  /**
   * Delete by ID.
   * @param {number} id ID.
   * @returns {Promise<number>}
   */
  async deleteById(id) {
    return await this.model.destroy({
      where: { id },
    });
  }

  /**
   * Create a subquery literal to add tags to workflow template queries.
   * @param {string} [workflowTemplateAlias] Workflow template alias (default 'workflowTemplate').
   * @returns {Sequelize.literal}
   */
  formAggregationSubquery(workflowTemplateAlias = 'workflowTemplate') {
    return Sequelize.literal(`(
      SELECT json_agg(
        json_build_object(
          'id', t.id,
          'name', t.name,
          'color', t.color,
          'description', t.description
        )
        ORDER BY t.name
      )
      FROM "workflow_template_tags" AS t
      JOIN "workflow_template_tag_map" AS m
        ON t.id = m.workflow_template_tag_id
      WHERE m.workflow_template_id = "${workflowTemplateAlias}".id
    )`);
  }

  /**
   * Create a subquery literal to filter workflow templates by tags.
   * @param {number[]} tags Tag IDS.
   * @param {string} [workflowTemplateAlias] Workflow template alias (default 'workflowTemplate').
   * @returns {Sequelize.literal}
   */
  formFilterSubquery(tags, workflowTemplateAlias = 'workflowTemplate') {
    return Sequelize.literal(
      `EXISTS (
        SELECT 1
        FROM workflow_template_tag_map wttm
        WHERE wttm.workflow_template_id = "${workflowTemplateAlias}".id
          AND wttm.workflow_template_tag_id IN (${tags.join(',')})
      )`,
    );
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowTemplateTagEntity}
   */
  prepareEntity(item) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    return new WorkflowTemplateTagEntity({
      id: item.id,
      name: item.name,
      color: item.color,
      description: item.description,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      createdBy: item.created_by,
      updatedBy: item.updated_by,
    });
  }

  /**
   * Prepare for model.
   * @param {WorkflowTemplateTagEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      id: item.id,
      name: item.name,
      color: item.color,
      description: item.description,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      created_by: item.createdBy,
      updated_by: item.updatedBy,
    };
  }
}

module.exports = WorkflowTemplateTagModel;
