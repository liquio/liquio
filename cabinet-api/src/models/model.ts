import _ from 'lodash';
import type { Model as SequelizeModel } from 'sequelize';

export interface PaginationParams {
  currentPage?: number;
  perPage?: number;
  sort?: Array<string[]>;
  filters?: Record<string, unknown>;
  where?: Record<string, unknown>;
  subQuery?: boolean;
  include?: unknown;
  [key: string]: unknown;
}

export interface PaginatedResult<T> {
  pagination: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
  };
  data: T[];
}

/**
 * Base model.
 */
export default class Model {
  db: typeof global.db;

  constructor() {
    this.db = global.db;
  }

  /**
   * Pagination.
   * @param data Data object.
   * @returns Paginated results.
   */
  async paginate({ currentPage = 1, perPage = 15, ...params }: PaginationParams = {}): Promise<PaginatedResult<unknown>> {
    const options: any = {
      order: [],
    };

    if (perPage > global.config.model.pagination.limitPerPage) {
      perPage = global.config.model.pagination.limitPerPage;
    }

    if (currentPage < 1) {
      currentPage = 1;
    }

    if (Array.isArray(params.sort)) {
      params.sort.forEach((item: string[]) => {
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

    if (params.where) {
      options.where = { ...options.where, ...params.where };
    }

    if (typeof params.subQuery !== 'undefined' && params.subQuery === false) {
      options.subQuery = false;
    }

    if (params.include) {
      options.include = params.include;
    }

    options.offset = (currentPage - 1) * perPage;
    options.limit = perPage;

    const { count, rows } = await (this as any).findAndCountAll(options);

    return {
      pagination: {
        total: count,
        perPage,
        currentPage,
        lastPage: Math.max(Math.ceil(count / perPage), 1),
      },
      data: rows,
    };
  }

  /**
   * Get entities by relations.
   * @param options Relations.
   * @returns Entity with relations.
   */
  async getEntitiesByRelations({
    relations,
    sequelizeModel,
    entity,
  }: {
    relations: string[];
    sequelizeModel: SequelizeModel;
    entity: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    try {
      for (const relation of relations) {
        const items = await (sequelizeModel as any)[`get${_.upperFirst(relation)}`]();
        if (items) {
          entity[relation] = items.map((item: any) => item.prepareEntity(item));
        }
      }
    } catch (error) {
      global.log.save('relation-error', error, 'error');
      throw error;
    }

    return entity;
  }

  /**
   * Prepare object to array.
   * @param options Options.
   * @returns Flattened array.
   */
  prepareSort(options: Record<string, unknown>): unknown[][] {
    return Object.entries(options)
      .map((v: [string, unknown]) => {
        if (typeof v[1] === 'object') {
          const result: unknown[] = [_.camelCase(v[0])];
          Object.entries(v[1] as Record<string, unknown>).forEach((entry) => {
            result.push(entry);
          });
          return _.flatten(result) as unknown;
        }
        return _.flatten(v) as unknown;
      })
      .map((v: unknown) => _.flatten(v as any));
  }
}
