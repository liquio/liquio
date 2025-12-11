const Sequelize = require('sequelize');
const Model = require('./model');
const SnippetEntity = require('../entities/snippet');

class SnippetsModel extends Model {
  constructor() {
    if (!SnippetsModel.singleton) {
      super();

      this.model = this.db.define(
        'snippets',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          snippet_group_name: {
            type: Sequelize.STRING(255),
            allowNull: true,
            references: { model: 'snippet_groups', key: 'name' },
          },
          name: Sequelize.STRING(255),
          type: {
            allowNull: false,
            type: Sequelize.ENUM,
            values: ['control', 'function', 'container'],
          },
          data: Sequelize.TEXT,
          meta: Sequelize.JSONB,
        },
        {
          tableName: 'snippets',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      SnippetsModel.singleton = this;
    }

    return SnippetsModel.singleton;
  }

  /**
   * @param {number} id
   * @return {Promise<SnippetsEntity>}
   */
  async findById(id) {
    let snippet;
    try {
      snippet = await this.model.findByPk(id, {
        include: [{ model: models.snippetGroups.model, attributes: ['name'] }],
      });
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }
    if (!snippet) {
      return;
    }

    if (snippet.snippet_group) {
      snippet.snippet_group = models.snippetGroups.prepareEntity(snippet.snippet_group);
    }
    return this.prepareEntity(snippet);
  }

  /**
   * @return {Promise<SnippetsEntity[]>}
   */
  async getAll({ idList } = {}) {
    const where = {};
    if (global.typeOf(idList) === 'array' && idList.length) {
      where.id = { [Sequelize.Op.in]: idList };
    }

    let snippets;
    try {
      snippets = await this.model.findAll({
        where: where,
        include: [{ model: models.snippetGroups.model }],
      });
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    if (!snippets) {
      return;
    }

    return snippets.map((snippet) => {
      if (snippet.snippet_group) {
        snippet.snippet_group = models.snippetGroups.prepareEntity(snippet.snippet_group);
      }
      return this.prepareEntity(snippet);
    });
  }

  /**
   * @param {Object} snippet
   * @return {Promise<SnippetsEntity>}
   */
  async createOne(snippet) {
    let createdSnippet;
    try {
      createdSnippet = await this.model.create(this.prepareForModel(snippet));
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    return await this.findById(createdSnippet.id);
  }

  /**
   * @param {Array<SnippetEntity>} snippets
   * @param {Object} [options]
   * @param {boolean} [options.ignoreDuplicates]
   * @param {Sequelize.transaction} [options.transaction]
   * @return {Promise<number>}
   */
  async bulkCreate(snippets, { ignoreDuplicates = false, transaction } = {}) {
    let createdSnippets;
    try {
      createdSnippets = await this.model.bulkCreate(snippets.map(this.prepareForModel), {
        ignoreDuplicates,
        transaction,
      });
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw new global.SequelizeDbError(error);
    }

    return createdSnippets.length;
  }

  /**
   * @param {SnippetEntity.id} id
   * @param {SnippetEntity} snippet
   * @return {Promise<undefined|SnippetEntity[]>}
   */
  async updateById(id, snippet) {
    let updateResult;
    try {
      updateResult = await this.model.update(this.prepareForModel(snippet), {
        where: {
          id: id,
        },
        returning: true,
      });
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    const [updatedCount, [updatedSnippet]] = updateResult;
    if (updatedCount < 1) {
      return;
    }

    return await this.findById(updatedSnippet.id);
  }

  /**
   * @param {number} id
   * @return {Promise<number>}
   */
  async deleteById(id) {
    let deletedCount;
    try {
      deletedCount = await this.model.destroy({ where: { id: id } });
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
   * @param {Object} params
   * @param {Array<SnippetEntity.id>} [params.idList]
   * @return {Promise<SnippetsEntity[]>}
   */
  async export({ idList } = {}) {
    const where = {};
    if (global.typeOf(idList) === 'array' && idList.length) {
      where.id = { [Sequelize.Op.in]: idList };
    }

    let snippets;
    try {
      snippets = await this.model.findAll({
        where: where,
        include: [{ model: models.snippetGroups.model }],
      });
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    if (!snippets) {
      return;
    }

    return snippets.map((snippet) => {
      if (snippet.snippet_group) {
        snippet.snippet_group = models.snippetGroups.prepareEntity(snippet.snippet_group);
      }
      return this.prepareEntity(snippet);
    });
  }

  /**
   * Prepare entity.
   * @param {Object} item Item.
   * @returns {SnippetEntity}
   */
  prepareEntity(item) {
    return new SnippetEntity({
      id: item.id,
      name: item.name,
      type: item.type,
      snippetGroup: item.snippet_group,
      data: item.data,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {SnippetEntity} item Item.
   * @returns {Object} Prepared for model object.
   */
  prepareForModel(item) {
    return {
      name: item.name,
      type: item.type,
      snippet_group_name: item.snippetGroupName,
      data: item.data,
    };
  }
}

module.exports = SnippetsModel;
