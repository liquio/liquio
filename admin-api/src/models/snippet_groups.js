const Sequelize = require('sequelize');
const Model = require('./model');
const SnippetGroupEntity = require('../entities/snippet_group');

class SnippetGroupsModel extends Model {
  constructor() {
    if (!SnippetGroupsModel.singleton) {
      super();

      this.model = this.db.define(
        'snippet_groups',
        {
          name: {
            type: Sequelize.STRING(255),
            primaryKey: true,
            allowNull: false,
          },
        },
        {
          tableName: 'snippet_groups',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      SnippetGroupsModel.singleton = this;
    }

    return SnippetGroupsModel.singleton;
  }

  /**
   * @param {SnippetGroupEntity.id} id
   * @return {Promise<SnippetsEntity>}
   */
  async findById(id) {
    let snippetGroup;
    try {
      snippetGroup = await this.model.findByPk(id);
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }
    if (!snippetGroup) {
      return;
    }

    return this.prepareEntity(snippetGroup);
  }

  /**
   * @return {Promise<SnippetGroupEntity[]>}
   */
  async getAll() {
    let snippetGroups;
    try {
      snippetGroups = await this.model.findAll();
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    if (!snippetGroups) {
      return;
    }

    return snippetGroups.map(this.prepareEntity);
  }

  /**
   * @param {SnippetGroupEntity} snippetGroup
   * @return {Promise<SnippetGroupEntity>}
   */
  async createOne(snippetGroup) {
    let createdSnippetGroup;
    try {
      createdSnippetGroup = await this.model.create(this.prepareForModel(snippetGroup));
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    return this.prepareEntity(createdSnippetGroup);
  }

  /**
   * @param {SnippetGroupEntity.name} name
   * @param {SnippetGroupEntity} snippetGroup
   * @return {Promise<undefined|SnippetGroupEntity[]>}
   */
  async updateByName(name, snippetGroup) {
    let updateResult;
    try {
      updateResult = await this.model.update(
        {
          name: snippetGroup.name,
        },
        {
          where: {
            name: name,
          },
          returning: true,
        },
      );
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    const [updatedCount, updatedSnippetGroups] = updateResult;
    if (updatedCount < 1) {
      return;
    }

    return updatedSnippetGroups.map(this.prepareEntity);
  }

  /**
   * @param {SnippetGroupEntity.name} name
   * @return {Promise<number>}
   */
  async deleteByName(name) {
    let deletedCount;
    try {
      deletedCount = await this.model.destroy({ where: { name: name } });
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    return deletedCount;
  }

  /**
   * @param {Object} [options]
   * @param {Sequelize.transaction} [options.transaction]
   * @return {Promise<number>}
   */
  async deleteAll({ transaction } = {}) {
    let deletedCount;
    try {
      deletedCount = await this.model.destroy({ where: {}, transaction });
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw new global.SequelizeDbError(error);
    }

    return deletedCount;
  }

  /**
   * @param {Array<SnippetGroupEntity>} snippetGroups
   * @param {Object} [options]
   * @param {boolean} [options.ignoreDuplicates]
   * @param {Sequelize.transaction} [options.transaction]
   * @return {Promise<number>}
   */
  async bulkCreate(snippetGroups, { ignoreDuplicates = false, transaction } = {}) {
    let createdSnippets;
    try {
      createdSnippets = await this.model.bulkCreate(snippetGroups.map(this.prepareForModel), {
        ignoreDuplicates,
        transaction,
      });
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw new global.SequelizeDbError(error);
    }

    return createdSnippets.filter((v) => v.isNewRecord).length;
  }

  /**
   * Prepare entity.
   * @param {Object} item Item.
   * @returns {SnippetGroupEntity}
   */
  prepareEntity(item) {
    return new SnippetGroupEntity({
      name: item.name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {SnippetGroupEntity} item Item.
   * @returns {Object} Prepared for model object.
   */
  prepareForModel(item) {
    return {
      name: item.name,
    };
  }
}

module.exports = SnippetGroupsModel;
