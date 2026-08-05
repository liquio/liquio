import Sequelize from 'sequelize';

import Model from './model';
import RegisterEntity from '../entities/register';
import KeyModel from './key';
import { PgPubSub, PubSubCallbackData } from '../lib/pgpubsub';
import { RedisClient } from '../lib/redis_client';

// Constants.
const DEFAULT_CACHE_TTL = 300; // 5 minutes

/**
 * Register model.
 */
export default class RegisterModel extends Model {
  private static singleton: RegisterModel;
  private cacheTtl: { [key: string]: number };
  public keyModel: KeyModel;
  public model: any;

  /**
   * Constructor.
   * @param {object} config Config.
   * @param {object} options Options.
   */
  constructor(config, options) {
    // Define singleton.
    if (!RegisterModel.singleton) {
      super(config, options);

      this.model = this.db.define(
        'register',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            type: Sequelize.INTEGER
          },
          name: {
            allowNull: false,
            type: Sequelize.STRING
          },
          description: {
            allowNull: false,
            type: Sequelize.STRING
          },
          parent_id: {
            type: Sequelize.INTEGER,
            references: { model: 'registers', key: 'id' }
          },
          meta: {
            allowNull: false,
            type: Sequelize.JSON,
            defaultValue: {}
          },
          created_by: {
            allowNull: false,
            type: Sequelize.STRING
          },
          updated_by: {
            allowNull: false,
            type: Sequelize.STRING
          }
        },
        {
          tableName: 'registers',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      PgPubSub.getInstance()?.subscribe('registers_row_change_notify', this.onRowChange.bind(this));

      this.cacheTtl = {
        findByPk: global.config?.cache?.register?.findByPk || DEFAULT_CACHE_TTL,
        getAll: global.config?.cache?.register?.getAll || DEFAULT_CACHE_TTL
      };

      RegisterModel.singleton = this;
    }

    return RegisterModel.singleton;
  }

  static getInstance(): RegisterModel | undefined {
    return RegisterModel.singleton;
  }

  /**
   * Get all.
   * @param {object} [options] Options.
   * @param {object} [options.filter={}] Filter. Sample: { register_id: 1, parent_id: 1 }.
   * @param {object} [options.offset=0] Offset. Sample: 0.
   * @param {object} [options.limit=2] Limit. Sample: 20.
   * @returns {Promise<{data: RegisterEntity[], meta: {count, offset, limit}}>} Registers promise.
   */
  async getAll(options: { filter?: any; offset?: number; limit?: number } = {}) {
    // Handle options.
    const { filter, offset, limit } = { offset: 0, limit: 2, filter: {}, ...options };
    if (filter.name) {
      filter.name = {
        [Sequelize.Op.iLike]: `%${filter.name}%`
      };
    }
    const queryOptions = {
      subQuery: false,
      include: filter['$keys.id$']
        ? [
            {
              model: this.keyModel.model,
              attributes: []
            }
          ]
        : [],
      order: [['created_at', 'desc']],
      where: filter,
      offset,
      limit
    };

    // DB query with cache.
    const {
      data: { count, rows: registersRaw }
    } = await RedisClient.getOrSet(
      ['register', 'getAll', { filter, offset, limit }],
      () => this.model.findAndCountAll(queryOptions),
      this.cacheTtl.getAll
    );

    const registersEntities = registersRaw.map((registerRaw: any) => new RegisterEntity(registerRaw));

    return { data: registersEntities, meta: { count, offset, limit } };
  }

  /**
   * Find by ID.
   */
  async findById(id: number): Promise<{ data: RegisterEntity }> {
    // DB query with cache.
    const { data: registerRaw } = await RedisClient.getOrSet(['register', 'findById', id], () => this.model.findByPk(id), this.cacheTtl.findByPk);
    if (!registerRaw) return;
    const registerEntity = new RegisterEntity(registerRaw);

    return { data: registerEntity };
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
  async create({
    id,
    name,
    description,
    parentId,
    meta,
    user
  }: {
    id?: number;
    name: string;
    description: string;
    parentId: number;
    meta: string;
    user: string;
  }) {
    // Prepare RAW.
    const registerToCreateRaw = {
      id: undefined,
      name: name,
      description: description,
      parent_id: parentId,
      meta: meta,
      created_by: user,
      updated_by: user
    };

    if (id) registerToCreateRaw.id = id;

    // DB query.
    const createdRegisterRaw = await this.model.create(registerToCreateRaw);
    const createdRegisterEntity = new RegisterEntity(createdRegisterRaw);

    return { data: createdRegisterEntity };
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
    const registerToUpdateRaw = this.removeUndefinedProperties({
      name: name,
      description: description,
      parent_id: parentId,
      meta: meta,
      updated_by: user
    });

    // DB query.
    const [updatedRowsCount, [updatedRegisterRaw]] = await this.model.update(registerToUpdateRaw, { where: { id }, returning: true });
    const updatedRegisterEntity = new RegisterEntity(updatedRegisterRaw);

    return { data: updatedRegisterEntity, updating: { rowsCount: updatedRowsCount } };
  }

  /**
   * Delete.
   * @param {number} id ID.
   * @returns {Promise<{data: number}>} Deleted rows count.
   */
  async delete(id) {
    // DB query.
    const deletedRowsCount = await this.model.destroy({ where: { id } });

    return { data: deletedRowsCount };
  }

  /**
   * Event handler for row change.
   */
  private async onRowChange(channel: string, { id }: PubSubCallbackData) {
    const redis = RedisClient.getInstance();
    if (redis) {
      redis.deleteMany(['register', 'getAll', '*']);
      redis.delete(['register', 'findById', id]);
    }
  }
}
