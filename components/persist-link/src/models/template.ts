// Import.
import Sequelize from 'sequelize';

import Model from './model';

/**
 * Template model.
 */
class TemplateModel extends Model {
  /**
   * Constructor.
   */
  constructor() {
    super();

    if (!TemplateModel.singleton) {
      this.model = this.db.define(
        'template',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            type: Sequelize.INTEGER,
          },
          name: Sequelize.STRING,
          method: Sequelize.STRING,
          html: Sequelize.TEXT,
          pdf: Sequelize.TEXT,
          json_map: Sequelize.JSONB,
          options: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
        },
        {
          tableName: 'templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      TemplateModel.singleton = this;
    }

    return TemplateModel.singleton;
  }

  /**
   * Find by name and method.
   * @param {string} name Name.
   * @param {string} method Method.
   * @returns {Promise<object>}
   */
  async findByNameAndMethod(name, method) {
    const template = await this.model.findOne({ where: { name, method } });
    if (!template) {
      return;
    }

    return {
      id: template.id,
      name: template.name,
      method: template.method,
      html: template.html,
      pdf: template.pdf,
      jsonMap: template.json_map,
      options: template.options,
    };
  }

  /**
   * Get all.
   * @returns {Promise<object[]>}
   */
  async getAll() {
    const templates = await this.model.findAll();
    if (!templates) {
      return;
    }

    return templates.map((template) => ({
      id: template.id,
      name: template.name,
      method: template.method,
    }));
  }

  /**
   * Find by id.
   * @param {number} id ID.
   * @returns {Promise<object>}
   */
  async findById(id) {
    const template = await this.model.findByPk(id);
    if (!template) {
      return;
    }

    return {
      id: template.id,
      name: template.name,
      method: template.method,
      html: template.html,
      pdf: template.pdf,
      jsonMap: template.json_map,
      options: template.options,
    };
  }

  /**
   * Create.
   * @param {object} data Data.
   * @returns {Promise<object>}
   */
  async create(data) {
    const preparedData = {
      name: data.name,
      method: data.method,
      html: data.html,
      pdf: data.pdf,
      json_map: data.jsonMap,
      options: data.options,
    };

    const template = await this.model.create(preparedData);
    if (!template) {
      return;
    }

    return {
      id: template.id,
      name: template.name,
      method: template.method,
      html: template.html,
      pdf: template.pdf,
      jsonMap: template.json_map,
      options: template.options,
    };
  }

  /**
   * Update.
   * @param {number} id ID.
   * @param {object} data Data.
   * @returns {Promise<object>}
   */
  async update(id, data) {
    const preparedData = {
      name: data.name,
      method: data.method,
      html: data.html,
      pdf: data.pdf,
      json_map: data.jsonMap,
      options: data.options,
    };
    const [, templates] = await this.model.update(preparedData, { where: { id }, returning: true });

    if (templates.length === 0) {
      return;
    }

    const updatedTemplate = templates[0];

    return {
      id: updatedTemplate.id,
      name: updatedTemplate.name,
      method: updatedTemplate.method,
      html: updatedTemplate.html,
      pdf: updatedTemplate.pdf,
      jsonMap: updatedTemplate.json_map,
      options: updatedTemplate.options,
    };
  }

  /**
   * Delete.
   * @param {number} id ID.
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const deleted = await this.model.destroy({ where: { id } });

    return deleted === 1;
  }
}

// Export.
export default TemplateModel;
