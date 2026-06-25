import { camelCase, upperFirst } from 'lodash';
import { ModelStatic, Sequelize, Model as SequelizeModel } from 'sequelize';

export type PaginationMeta = {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
};

export type PaginatedResult<T> = {
  pagination: PaginationMeta;
  data: T[];
};

export type PaginateParams = {
  currentPage?: number;
  perPage?: number;
  sort?: any[];
  filters?: Record<string, any>;
  attributes?: any;
  subQuery?: boolean;
  include?: any;
  distinct?: boolean;
  group?: any;
  maxLimit?: boolean;
};

export type PaginateOptions = {
  order: any[];
  where?: Record<string, any>;
  attributes?: any;
  subQuery?: boolean;
  include?: any;
  distinct?: boolean;
  offset?: number;
  limit?: number;
  group?: any;
};

export type PaginateContext = {
  findAll: (options: PaginateOptions) => Promise<any[]>;
  findAndCountAll: (options: PaginateOptions) => Promise<{ count: number | any[]; rows: any[] }>;
};

export type PaginateMethod = (
  this: PaginateContext,
  params?: PaginateParams,
  extra?: { briefInfo?: boolean },
) => Promise<PaginatedResult<any>>;

export type SequelizeModelWithPaginate<TModel extends SequelizeModel = SequelizeModel> = ModelStatic<TModel> & {
  paginate: PaginateMethod;
};

/**
 * Base model.
 * @typedef {import('sequelize/lib/model')} Model
 */
export class Model {
  public db: Sequelize;
  public model: ModelStatic<SequelizeModel>;

  constructor(dbInstance?: Sequelize) {
    this.db = dbInstance || global.db;
  }

  /**
   * Pagination.
   * @param {object} [data] Data object.
   * @param {number} [data.currentPage] Offset.
   * @param {number} [data.perPage] Limit items.
   * @param {object} [data.params] Options to filter query.
   * @returns {Promise<object>}
   */
  async paginate(
    this: PaginateContext,
    { currentPage = 1, perPage = 15, ...params }: PaginateParams = {},
    { briefInfo = false }: { briefInfo?: boolean } = {},
  ): Promise<PaginatedResult<any>> {
    const options: PaginateOptions = {
      order: [],
    };

    const limitPerPage = global.config.model?.pagination?.limitPerPage || 100;
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
        const items = await sequelizeModel[`get${upperFirst(relation)}`]();
        if (items) {
          entity[relation] = items.map((item) => item.prepareEntity(item));
        }
      }
    } catch (error) {
      global.log.save('relation-error', error);
      throw error;
    }

    return entity;
  }

  /**
   * Prepare object to array.
   * @returns {any[]}
   */
  prepareSort(options: object): any[] {
    const output: any[] = [];

    Object.entries(options).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        output.push([camelCase(key), ...Object.entries(value as Record<string, unknown>)]);
      } else {
        output.push([key, value]);
      }
    });

    return output;
  }

  /**
   * @protected
   * @param {string} count
   * @param {number} currentPage
   * @param {number} perPage
   * @return {{total: number, perPage: number, lastPage: number, currentPage: number}}
   */
  formPagination(count: string, currentPage: number, perPage: number): { total: number, perPage: number, lastPage: number, currentPage: number } {
    return {
      total: +count,
      currentPage: currentPage,
      perPage: perPage,
      lastPage: Math.max(Math.ceil(+count / perPage), 1),
    };
  }
}

module.exports = Model;
