import camelCase from 'lodash/camelCase';
import upperFirst from 'lodash/upperFirst';

/**
 * Params accepted by {@link Model#paginate}. Spread across a real caller's query params, so this
 * intentionally keeps an index signature for whatever extra filter fields a subclass passes
 * through in `...params` (folded into `options.where` below).
 */
export interface PaginateParams {
  currentPage?: number;
  perPage?: number;
  /** List of `[field, ...subFields, direction]` tuples (or bare `[field, direction]`). */
  sort?: unknown[];
  filters?: Record<string, unknown>;
  where?: Record<string, unknown>;
  subQuery?: boolean;
  include?: unknown;
  [key: string]: unknown;
}

export interface PaginatedResult<TRow = unknown> {
  pagination: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
  };
  data: TRow[];
}

/**
 * Minimal shape {@link Model#paginate} needs from whatever it's invoked on. It is never called as
 * a normal instance method - every subclass that uses it reattaches it directly onto its
 * Sequelize model instead (`this.model.paginate = this.paginate;`) and calls it from there
 * (`this.model.paginate(...)`), so `this` inside the method body is that Sequelize model, not a
 * `Model` instance - hence the explicit `this` parameter type below instead of `(this as any)`.
 */
export interface FindAndCountable<TRow = unknown> {
  findAndCountAll(options: Record<string, unknown>): Promise<{ count: number; rows: TRow[] }>;
}

export interface GetEntitiesByRelationsParams<TEntity = Record<string, unknown>> {
  relations: string[];
  /** A live Sequelize model instance exposing association getters (e.g. `getTasks()`). */
  sequelizeModel: Record<string, unknown>;
  entity: TEntity;
}

/**
 * Base model.
 */
export class Model {
  db: any;

  constructor() {
    this.db = global.db;
  }

  /**
   * Pagination. See {@link FindAndCountable} for why `this` is typed explicitly here.
   * @returns Paginated rows plus page metadata.
   */
  async paginate<TRow = unknown>(
    this: FindAndCountable<TRow>,
    { currentPage = 1, perPage = 15, ...params }: PaginateParams = {},
  ): Promise<PaginatedResult<TRow>> {
    const options: Record<string, unknown> = {
      order: [],
    };

    if (perPage > global.config.model.pagination.limitPerPage) {
      perPage = global.config.model.pagination.limitPerPage;
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

        (options.order as unknown[]).push(item);
      });
    }

    if ((options.order as unknown[]).length === 0) {
      (options.order as unknown[]).push(['created_at', 'desc']);
    }

    if (params.filters) {
      options.where = params.filters;
    }

    if (params.where) {
      options.where = { ...(options.where as Record<string, unknown>), ...params.where };
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
        lastPage: Math.max(Math.ceil(count / perPage), 1),
      },
      data: rows,
    };
  }

  /**
   * Get entities by relations.
   * @returns `entity`, mutated in place with each resolved relation attached.
   */
  async getEntitiesByRelations<TEntity = Record<string, unknown>>({
    relations,
    sequelizeModel,
    entity,
  }: GetEntitiesByRelationsParams<TEntity>): Promise<TEntity> {
    try {
      await Promise.all(
        relations.map(async (relation) => {
          const items = await (sequelizeModel[`get${upperFirst(relation)}`] as () => Promise<any[]>)();
          if (items) {
            (entity as Record<string, unknown>)[relation] = items.map((item) => item.prepareEntity(item));
          }
        }),
      );
    } catch (error) {
      global.log.save('relation-error', error, 'error');
      throw error;
    }

    return entity;
  }

  /**
   * Turn a `{ field: 'asc' | 'desc' | { subField: 'asc' | 'desc' } }`-shaped sort object into the
   * array-of-tuples form Sequelize's `order` option expects.
   * @private
   */
  prepareSort(options: Record<string, unknown>): unknown[][] {
    return Object.entries(options).flatMap(([key, value]) => {
      // If value is not an object, return the key-value pair
      if (typeof value !== 'object' || Array.isArray(value)) {
        return [[key, value]];
      }

      // Handle the 'meta' by flattening and joining with '.'
      if (key === 'meta') {
        return Object.entries(value as Record<string, unknown>).map(([subKey, subValue]) => {
          return [`${camelCase(key)}.${camelCase(subKey)}`, subValue];
        });
      }

      // For other objects, return flattened array
      return Object.entries(value as Record<string, unknown>).map(([subKey, subValue]) => {
        return [camelCase(key), subKey, subValue];
      });
    });
  }
}
