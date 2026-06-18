import sequelize, { Sequelize, Model as SequelizeModel, Optional } from 'sequelize';

import { Model, type PaginatedResult, type SequelizeModelWithPaginate } from './model';
import { AccessHistoryEntity } from '../entities/access_history';

type AccessHistoryEntityInput = ConstructorParameters<typeof AccessHistoryEntity>[0];
type AccessHistoryCreateInput = Omit<AccessHistoryEntityInput, 'id' | 'createdAt' | 'updatedAt'> &
  Partial<Pick<AccessHistoryEntityInput, 'id' | 'createdAt' | 'updatedAt'>>;

type AccessHistoryAttributes = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  ipn: string | null;
  operation_type: AccessHistoryEntityInput['operationType'];
  unit_id: number | null;
  unit_name: string | null;
  init_user_id: string | null;
  init_user_name: string | null;
  init_ipn: string | null;
  init_workflow_id: string | null;
  init_workflow_name: string | null;
  created_at: Date;
  updated_at: Date;
};

type AccessHistoryCreationAttributes = Optional<
  AccessHistoryAttributes,
  'id' | 'created_at' | 'updated_at' | 'init_workflow_id' | 'init_workflow_name'
>;

type AccessHistorySequelizeInstance = SequelizeModel<
  AccessHistoryAttributes,
  AccessHistoryCreationAttributes
> &
  AccessHistoryAttributes;

type AccessHistoryFilters = {
  [key: string]: any;
};

type AccessHistoryGetAllOptions = {
  currentPage?: number;
  perPage?: number;
  filters?: AccessHistoryFilters;
  sort?: Record<string, any> | any[];
};

type SequelizeAccessHistoryModel = SequelizeModelWithPaginate<AccessHistorySequelizeInstance>;

/**
 * Access history model.
 */
export class AccessHistoryModel extends Model {
  static singleton: AccessHistoryModel;
  public model: SequelizeAccessHistoryModel;

  /**
   * Access history model constructor.
   */
  constructor(dbInstance?: Sequelize) {
    // Singleton.
    if (!AccessHistoryModel.singleton) {
      // Call parent constructor.
      super(dbInstance);

      // Sequelize model.
      this.model = this.db.define(
        'accessHistory',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: sequelize.UUID,
            defaultValue: sequelize.UUIDV1,
          },
          user_id: {
            allowNull: true,
            type: sequelize.STRING,
          },
          user_name: {
            allowNull: true,
            type: sequelize.STRING,
          },
          ipn: {
            allowNull: true,
            type: sequelize.STRING,
          },
          operation_type: {
            allowNull: false,
            type: sequelize.ENUM,
            values: [
              'added-to-head-unit',
              'added-to-member-unit',
              'deleted-from-head-unit',
              'deleted-from-member-unit',
              'added-to-admin',
              'deleted-from-admin',
            ],
          },
          unit_id: {
            allowNull: true,
            type: sequelize.INTEGER,
          },
          unit_name: {
            allowNull: true,
            type: sequelize.STRING,
          },
          init_user_id: {
            allowNull: true,
            type: sequelize.STRING,
          },
          init_user_name: {
            allowNull: true,
            type: sequelize.STRING,
          },
          init_ipn: {
            allowNull: true,
            type: sequelize.STRING,
          },
          init_workflow_id: {
            allowNull: true,
            type: sequelize.UUID,
          },
          init_workflow_name: {
            allowNull: true,
            type: sequelize.STRING,
          },
        },
        {
          tableName: 'access_history',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      ) as SequelizeAccessHistoryModel;

      // Sequelize model params.
      (this.model.prototype as AccessHistorySequelizeInstance & {
        prepareEntity: (item: AccessHistorySequelizeInstance) => AccessHistoryEntity;
      }).prepareEntity = this.prepareEntity;
      this.model.paginate = this.paginate;

      // Define singleton.
      AccessHistoryModel.singleton = this;
    }

    // Return singleton.
    return AccessHistoryModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<AccessHistoryEntity[]>}
   */
  async getAll({ currentPage, perPage, filters = {}, sort = {} }: AccessHistoryGetAllOptions): Promise<PaginatedResult<AccessHistoryEntity>> {
    const sequelizeOptions: {
      currentPage?: number;
      perPage?: number;
      filters: AccessHistoryFilters;
      sort: any[];
    } = {
      currentPage,
      perPage,
      filters: { ...filters },
      sort: [['created_at', 'desc']],
    };

    if (typeof filters.init_user_name !== 'undefined') {
      sequelizeOptions.filters.init_user_name = {
        [sequelize.Op.iLike]: `%${filters.init_user_name}%`,
      };
    }
    if (typeof filters.unit_name !== 'undefined') {
      sequelizeOptions.filters.unit_name = {
        [sequelize.Op.iLike]: `%${filters.unit_name}%`,
      };
    }
    if (typeof filters.user_name !== 'undefined') {
      sequelizeOptions.filters.user_name = {
        [sequelize.Op.iLike]: `%${filters.user_name}%`,
      };
    }
    if (typeof filters.search !== 'undefined') {
      const searchTerm = `%${filters.search}%`;
      (sequelizeOptions.filters as any)[sequelize.Op.or] = [
        { user_name: { [sequelize.Op.iLike]: searchTerm } },
        { init_user_name: { [sequelize.Op.iLike]: searchTerm } },
        { unit_name: { [sequelize.Op.iLike]: searchTerm } },
      ];
      delete sequelizeOptions.filters.search;
    }
    if (typeof filters.from_created_at !== 'undefined' && typeof filters.to_created_at !== 'undefined') {
      sequelizeOptions.filters['created_at'] = sequelize.where(sequelize.fn('date', sequelize.col('created_at')), {
        [sequelize.Op.between]: [filters.from_created_at, filters.to_created_at],
      });

      delete sequelizeOptions.filters.from_created_at;
      delete sequelizeOptions.filters.to_created_at;
    } else if (typeof filters.from_created_at !== 'undefined') {
      sequelizeOptions.filters['created_at'] = sequelize.where(sequelize.fn('date', sequelize.col('created_at')), {
        [sequelize.Op.gte]: filters.from_created_at,
      });

      delete sequelizeOptions.filters.from_created_at;
    } else if (typeof filters.to_created_at !== 'undefined') {
      sequelizeOptions.filters['created_at'] = sequelize.where(sequelize.fn('date', sequelize.col('created_at')), {
        [sequelize.Op.lte]: filters.to_created_at,
      });

      delete sequelizeOptions.filters.to_created_at;
    }

    const preparedSort = this.prepareSort(sort as Record<string, unknown>);
    if (preparedSort.length > 0) {
      sequelizeOptions.sort = preparedSort;
    }

    const entities = (await this.model.paginate(sequelizeOptions)) as PaginatedResult<AccessHistorySequelizeInstance>;

    return {
      ...entities,
      data: entities.data.map((item) => this.prepareEntity(item)),
    };
  }

  /**
   * Create.
   * @param {object} data Access history.
   * @param {string} options.id ID.
   * @param {string} options.userId User ID.
   * @param {string} options.userName User name.
   * @param {string} options.ipn Ipn.
   * @param {'added-to-head-unit'|'added-to-member-unit'|'deleted-from-head-unit'|'deleted-from-member-unit'|'added-to-admin'|'deleted-from-admin'} options.operationType Operation type.
   * @param {number} options.unitId Unit ID.
   * @param {string} options.unitName Unit name.
   * @param {string} options.initUserId Init user ID.
   * @param {string} options.initUserName Init user name.
   * @param {string} options.initIpn Init ipn.
   * @param {string} options.initWorkflowId Init workflow ID.
   * @param {string} options.initWorkflowName Init workflow name.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   * @returns {Promise<AccessHistoryEntity>}
   */
  async create(data: AccessHistoryCreateInput): Promise<AccessHistoryEntity> {
    const accessHistory = await this.model.create(this.prepareForModel(data));

    return this.prepareEntity(accessHistory);
  }

  /**
   * Save by groups of objects.
   * @param {object} currentUser
   * @param {object} [unit]
   * @param {string} operationType
   * @param {object} [user]
   */
  async save({
    currentUser,
    operationType,
    unit,
    user,
  }: {
    currentUser: { userId: string; name: string; ipn: string };
    operationType: AccessHistoryEntityInput['operationType'];
    unit?: { id?: number; name?: string };
    user?: { userId?: string; name?: string; ipn?: string };
  }): Promise<void> {
    await this.create({
      userId: user && user.userId,
      userName: user && user.name,
      ipn: user && user.ipn,
      operationType: operationType,
      unitId: unit && unit.id,
      unitName: unit && unit.name,
      initUserId: currentUser.userId,
      initUserName: currentUser.name,
      initIpn: currentUser.ipn,
    });
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {AccessHistoryEntity}
   */
  prepareEntity(item: AccessHistorySequelizeInstance): AccessHistoryEntity {
    return new AccessHistoryEntity({
      id: item.id,
      userId: item.user_id,
      userName: item.user_name,
      ipn: item.ipn,
      operationType: item.operation_type,
      unitId: item.unit_id,
      unitName: item.unit_name,
      initUserId: item.init_user_id,
      initUserName: item.init_user_name,
      initIpn: item.init_ipn,
      initWorkflowId: item.init_workflow_id,
      initWorkflowName: item.init_workflow_name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {AccessHistoryEntity} item Item.
   * @returns {object} Prepared for model object.
   */
  prepareForModel(item: AccessHistoryCreateInput): AccessHistoryCreationAttributes {
    return {
      id: item.id,
      user_id: item.userId,
      user_name: item.userName,
      ipn: item.ipn,
      operation_type: item.operationType,
      unit_id: item.unitId,
      unit_name: item.unitName,
      init_user_id: item.initUserId,
      init_user_name: item.initUserName,
      init_ipn: item.initIpn,
      init_workflow_id: item.initWorkflowId,
      init_workflow_name: item.initWorkflowName,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}
