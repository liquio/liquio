const Sequelize = require('sequelize');
const Model = require('./model');
const ContainerEntity = require('../entities/container');

/**
 * Container model.
 */
class ContainerModel extends Model {
  /**
   * Constructor.
   */
  constructor() {
    if (!ContainerModel.singleton) {
      super();

      this.model = this.db.define(
        'container',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            type: Sequelize.INTEGER,
          },
          name: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          description: {
            type: Sequelize.STRING,
          },
          parent_id: {
            type: Sequelize.INTEGER,
            references: { model: 'containers', key: 'id' },
          },
          meta: {
            allowNull: false,
            type: Sequelize.JSON,
            defaultValue: {},
          },
          created_by: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          updated_by: {
            allowNull: false,
            type: Sequelize.STRING,
          },
        },
        {
          tableName: 'containers',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );
      ContainerModel.singleton = this;
    }

    return ContainerModel.singleton;
  }

  /**
   * Get all.
   * @param {object} [options] Options.
   * @param {object} [options.filter] Filter. Sample: { parent_id: 1 }.
   * @param {object} [options.offset] Offset. Sample: 0.
   * @param {object} [options.limit] Limit. Sample: 20.
   * @returns {Promise<{data: ContainerEntity[], meta: {count, offset, limit}}>} Containers promise.
   */
  async getAll(options = {}) {
    // Handle options.
    const { filter, offset, limit } = { offset: 0, limit: 2, filter: {}, ...options };
    let queryOptions = { order: [['created_at', 'desc']], where: filter, offset, limit };

    // DB query.
    const { count, rows: containersRaw } = await this.model.findAndCountAll(queryOptions);
    const containersEntities = containersRaw.map((containerRaw) => new ContainerEntity(containerRaw));

    // Define and return model response.
    const modelResponse = { data: containersEntities, meta: { count, offset, limit } };
    return modelResponse;
  }

  /**
   * Find by ID.
   * @param {number} id ID.
   * @returns {Promise<{data: ContainerEntity}>} Container promise.
   */
  async findById(id) {
    // DB query.
    const containerRaw = await this.model.findByPk(id);
    const containerEntity = new ContainerEntity(containerRaw);

    // Define and return model response.
    const modelResponse = { data: containerEntity };
    return modelResponse;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {string} data.name Name.
   * @param {string} data.description Description.
   * @param {number} data.parentId Parent ID.
   * @param {string} data.meta Meta info.
   * @param {string} data.user User.
   */
  async create({ name, description, parentId, meta, user }) {
    // Prepare RAW.
    const containerToCreateRaw = {
      name: name,
      description: description,
      parent_id: parentId,
      meta: meta,
      created_by: user,
      updated_by: user,
    };

    // DB query.
    const createdContainerRaw = await this.model.create(containerToCreateRaw);
    const createdContainerEntity = new ContainerEntity(createdContainerRaw);

    // Define and return model response.
    const modelResponse = { data: createdContainerEntity };
    return modelResponse;
  }

  /**
   * Update.
   * @param {number} id ID.
   * @param {object} data Data object.
   * @param {string} data.name Name.
   * @param {string} data.description Description.
   * @param {number} data.parentId Parent ID.
   * @param {string} data.meta Meta info.
   * @param {string} data.user User.
   */
  async update(id, { name, description, parentId, meta, user }) {
    // Prepare RAW.
    const containerToUpdateRaw = {
      name: name,
      description: description,
      parent_id: parentId,
      meta: meta,
      to_string: toString,
      updated_by: user,
    };

    // DB query.
    const [updatedRowsCount, [updatedContainerRaw]] = await this.model.update(containerToUpdateRaw, { where: { id }, returning: true });
    const updatedContainerEntity = new ContainerEntity(updatedContainerRaw);

    // Define and return model response.
    const modelResponse = { data: updatedContainerEntity, updating: { rowsCount: updatedRowsCount } };
    return modelResponse;
  }

  /**
   * Delete.
   * @param {number} id ID.
   * @returns {Promise<{data: number}>} Deleted rows count.
   */
  async delete(id) {
    // DB query.
    const deletedRowsCount = await this.model.destroy({ where: { id } });

    // Define and return model response.
    const modelResponse = { data: deletedRowsCount };
    return modelResponse;
  }
}

// Export.
module.exports = ContainerModel;
