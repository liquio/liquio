
const _ = require('lodash');

/**
 * Base model.
 * @typedef {import('sequelize/lib/model')} Model
 */
class Model {
  constructor() {
    this.db = db;
  }

  /**
   * Pagination.
   * @param {object} [data] Data object.
   * @param {number} [data.currentPage] Offset.
   * @param {number} [data.perPage] Limit items.
   * @param {object} [data.params] Options to filter query.
   * @returns {Promise<object>}
   */
  async paginate({ currentPage = 1, perPage = 15, ...params } = {}) {
    let options = {
      order: []
    };

    if (perPage > config.model.pagination.limitPerPage) {
      perPage = config.model.pagination.limitPerPage;
    }

    if (currentPage < 1) {
      currentPage = 1;
    }

    if (Array.isArray(params.sort)) {
      params.sort.forEach(item => {
        if (!Array.isArray(item)) {
          return;
        }
        const lastValue = item[item.length - 1].toLowerCase();
        if (lastValue !== 'asc' && lastValue !== 'desc') {
          item.push('desc');
        }

        options.order.push(item);
      });
    }

    if (options.order.length === 0) {
      options.order.push(['created_at', 'desc']);
    }

    if (params.filters) {
      options.where = params.filters;
    }

    if(params.where) {
      options.where = {...options.where, ...params.where};
    }

    if (typeof params.subQuery !== 'undefined' && params.subQuery === false) {
      options.subQuery = false;
    }

    if (params.include) {
      options.include = params.include;
    }

    options.offset = (currentPage - 1) * perPage;
    options.limit = perPage;

    const { count, rows } = await this.findAndCountAll(options);

    return {
      pagination: {
        total: count,
        perPage: perPage,
        currentPage: currentPage,
        lastPage: Math.max(Math.ceil(count / perPage), 1)
      },
      data: rows
    };
  }

  /**
   * Get entities by relations.
   * @param {object} options Relations.
   * @param {string[]} options.relations Relations.
   * @param {Model} options.sequelizeModel Sequelize model.
   * @param {object} options.entity Enity.
   * @returns {object}
   */
  async getEntitiesByRelations({ relations, sequelizeModel, entity }) {
    try {
      await Promise.all(relations.map(async relation => {
        const items = await sequelizeModel[`get${_.upperFirst(relation)}`]();
        if (items) {
          entity[relation] = items.map(item => item.prepareEntity(item));
        }
      }));
    } catch (error) {
      log.save('relation-error', error, 'error');
      throw error;
    }

    return entity;
  }

  /**
   * Prepare object to array.
   * @private
   * @param {object} options Options.
   * @returns {[]}
   */
  prepareSort(options) {
    return Object.entries(options).flatMap(([key, value]) => {
      // If value is not an object, return the key-value pair
      if (typeof value !== 'object' || Array.isArray(value)) {
        return [[key, value]];
      }

      // Handle the 'meta' by flattening and joining with '.'
      if (key === 'meta') {
        return Object.entries(value).map(([subKey, subValue]) => {
          return [`${_.camelCase(key)}.${_.camelCase(subKey)}`, subValue];
        });

      }

      // For other objects, return flattened array
      return Object.entries(value).map(([subKey, subValue]) => {
        return [_.camelCase(key),subKey, subValue];
      });
    });
  }
}

module.exports = Model;
