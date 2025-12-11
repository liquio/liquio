const _ = require('lodash');

/**
 * Base model.
 * @typedef {import('sequelize/lib/model')} Model
 */
class Model {
  constructor(dbInstance) {
    this.db = dbInstance || db;
  }

  /**
   * Pagination.
   * @param {object} [data] Data object.
   * @param {number} [data.currentPage] Offset.
   * @param {number} [data.perPage] Limit items.
   * @param {object} [data.params] Options to filter query.
   * @returns {Promise<object>}
   */
  async paginate({ currentPage = 1, perPage = 15, ...params } = {}, { briefInfo = false } = {}) {
    let options = {
      order: [],
    };

    const limitPerPage = config.model?.pagination?.limitPerPage || 100;
    if (!briefInfo && perPage > limitPerPage) {
      perPage = limitPerPage;
    }

    if (currentPage < 1) {
      currentPage = 1;
    }

    if (Array.isArray(params.sort)) {
      params.sort.forEach((item) => {
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

    if (params.attributes) {
      options.attributes = params.attributes;
    }

    if (typeof params.subQuery !== 'undefined' && params.subQuery === false) {
      options.subQuery = false;
    }

    if (params.include) {
      options.include = params.include;
    }

    if (params.distinct) {
      options.distinct = params.distinct;
    }

    options.offset = (currentPage - 1) * perPage;
    options.limit = perPage;

    if (params.group) {
      options.group = params.group;
    }

    let count, rows;
    if (params.maxLimit === true) {
      count = 100000;
      rows = await this.findAll(options);
    } else {
      ({ count, rows } = await this.findAndCountAll(options));
    }

    if (Array.isArray(count)) {
      count = count.length;
    }

    return {
      pagination: {
        total: count,
        perPage: perPage,
        currentPage: currentPage,
        lastPage: Math.max(Math.ceil(count / perPage), 1),
      },
      data: rows,
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
      for (const relation of relations) {
        const items = await sequelizeModel[`get${_.upperFirst(relation)}`]();
        if (items) {
          entity[relation] = items.map((item) => item.prepareEntity(item));
        }
      }
    } catch (error) {
      log.save('relation-error', error);
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
    return Object.entries(options)
      .map((v) => (typeof v[1] === 'object' ? _.flatten([_.camelCase(v[0]), Object.entries(v[1])]) : v))
      .map((v) => _.flatten(v));
  }

  /**
   * @protected
   * @param {string} count
   * @param {number} currentPage
   * @param {number} perPage
   * @return {{total: number, perPage: number, lastPage: number, currentPage: number}}
   */
  formPagination(count, currentPage, perPage) {
    return {
      total: +count,
      currentPage: currentPage,
      perPage: perPage,
      lastPage: Math.max(Math.ceil(+count / perPage), 1),
    };
  }
}

module.exports = Model;
