import Sequelize from 'sequelize';

import Model from './model';
import AfterhandlerEntity from '../entities/afterhandler';
import HistoryEntity from '../entities/history';
import HistoryModel from './history';
import RecordModel from './record';

/**
 * Afterhandler model.
 */
export default class AfterhandlerModel extends Model {
  private static singleton: AfterhandlerModel;
  public historyModel: HistoryModel;
  public recordModel: RecordModel;

  /**
   * Constructor.
   * @param {object} config Config.
   * @param {object} options Options.
   */
  constructor(config: any, options: any) {
    // Singleton.
    if (!AfterhandlerModel.singleton) {
      // Call Parent constructor.
      super(config, options);

      // Init model.
      this.model = this.db.define(
        'afterhandlers',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1
          },
          type: {
            allowNull: false,
            type: Sequelize.ENUM('blockchain', 'elastic', 'plink')
          },
          history_id: {
            type: Sequelize.UUID,
            references: { model: 'history', key: 'id' }
          },
          synced: {
            allowNull: false,
            defaultValue: false,
            type: Sequelize.BOOLEAN
          },
          has_error: {
            allowNull: false,
            defaultValue: false,
            type: Sequelize.BOOLEAN
          },
          error_message: {
            allowNull: true,
            type: Sequelize.TEXT
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
          tableName: 'afterhandlers',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      // Init singleton.
      AfterhandlerModel.singleton = this;
    }

    // Return singleton.
    return AfterhandlerModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id Afterhandler ID.
   * @returns {Promise<{data: AfterhandlerEntity}>} Afterhandler entity promise.
   */
  async findById(id) {
    // DB query.
    const afterhandlerRaw = await this.model.findByPk(id);
    const afterhandlerEntity = new AfterhandlerEntity(afterhandlerRaw);

    // Define and return model response.
    const modelResponse = { data: afterhandlerEntity };
    return modelResponse;
  }

  /**
   * Get all not synced by key ID.
   * @param {number} keyId Key ID.
   * @returns {Promise<{data: AfterhandlerEntity}>} Afterhandler entity promise.
   */
  async getAllNotSyncedByKeyId(keyId) {
    // DB query.
    const afterhandlersRaw = await this.model.findAll({
      include: [{ model: this.historyModel.model, where: { data: { keyId: keyId } } }],
      where: { synced: false }
    });
    const afterhandlers = afterhandlersRaw.map((afterhandlerRaw) => new AfterhandlerEntity(afterhandlerRaw));

    // Define and return model response.
    const modelResponse = { data: afterhandlers };
    return modelResponse;
  }

  /**
   * Find first not synced.
   * @param {string} type Type.
   * @returns {Promise<{data: AfterhandlerEntity}>} Afterhandler entity promise.
   */
  async findFirstNotSynced(type) {
    // DB query.
    const include = [{ model: this.historyModel.model }];
    const where = {
      type,
      synced: false,
      history_id: { [Sequelize.Op.ne]: null }
    };
    const order = [['created_at', 'asc']];
    const [afterhandlerRaw] = await this.model.findAll({ include, where, order, limit: 1 });

    // Define and return model response.
    const { history: historyRaw } = afterhandlerRaw || {};
    const historyEntity = historyRaw && new HistoryEntity(historyRaw);
    const afterhandlerEntity = afterhandlerRaw && new AfterhandlerEntity(afterhandlerRaw);
    if (afterhandlerEntity) {
      (afterhandlerEntity as any).history = historyEntity;
    }
    const modelResponse = { data: afterhandlerEntity };
    return modelResponse;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {string} data.type Afterhandler type.
   * @param {string} data.historyId History ID.
   * @param {string} data.user User.
   * @returns {Promise<{data: AfterhandlerEntity}>} Afterhandler entity promise.
   */
  async create({ type, historyId, user }) {
    // Prepare RAW.
    const preparedRawToCreate = {
      type,
      history_id: historyId,
      synced: false,
      created_by: user,
      updated_by: user
    };

    // DB query.
    const createdRaw = await this.model.create(preparedRawToCreate);
    const createdAfterhandlerEntity = new AfterhandlerEntity(createdRaw);

    // Define and return model response.
    const modelResponse = { data: createdAfterhandlerEntity };
    return modelResponse;
  }

  /**
   * Set synced.
   * @param {number} id Afterhandler ID.
   * @returns {Promise<{data: AfterhandlerEntity, meta: { updatedRowsCount }}>} Afterhandler entity promise.
   */
  async setSynced(id) {
    // DB query.
    const [updatedRowsCount, [afterhandlerRaw]] = await this.model.update({ synced: true }, { where: { id }, returning: true });

    // Define and return model response.
    const afterhandlerEntity = afterhandlerRaw && new AfterhandlerEntity(afterhandlerRaw);
    const modelResponse = { data: afterhandlerEntity, meta: { updatedRowsCount } };
    return modelResponse;
  }

  /**
   * Set synced with error by key ID.
   * @param {number} keyId Key ID.
   * @param {string} error Error message.
   * @returns {Promise<{data: AfterhandlerEntity, meta: { updatedRowsCount }}>} Afterhandler entity promise.
   */
  async setSyncedWithErrorByKeyid(keyId, error) {
    const { data: historyIds } = await this.historyModel.getByKeyId(keyId);
    const [updatedRowsCount] = await this.model.update(
      {
        synced: true,
        has_error: true,
        error_message: error
      },
      {
        where: {
          synced: false,
          history_id: historyIds.map((history) => history.id)
        },
        returning: true
      }
    );

    return updatedRowsCount;
  }

  async getLastByKeyId(keyId) {
    return this.model.findOne({
      include: [{ model: this.historyModel.model, where: { key_id: keyId } }],
      order: [['created_at', 'desc']]
    });
  }

  /**
   * Clear error
   * @param {number} id Afterhandler ID.
   * @returns {Promise<{data: AfterhandlerEntity, meta: { updatedRowsCount }}>} Afterhandler entity promise.
   */
  async clearError(id) {
    // DB query.
    const [updatedRowsCount, [afterhandlerRaw]] = await this.model.update(
      { has_error: false, error_message: null },
      { where: { id }, returning: true }
    );

    // Define and return model response.
    const afterhandlerEntity = afterhandlerRaw && new AfterhandlerEntity(afterhandlerRaw);
    const modelResponse = { data: afterhandlerEntity, meta: { updatedRowsCount } };
    return modelResponse;
  }

  /**
   * Set synced with error.
   * @param {number} id Afterhandler ID.
   * @param {string} error Error message.
   * @returns {Promise<{data: AfterhandlerEntity, meta: { updatedRowsCount }}>} Afterhandler entity promise.
   */
  async setSyncedWithError(id, error) {
    // DB query.
    const [updatedRowsCount, [afterhandlerRaw]] = await this.model.update(
      { synced: true, has_error: true, error_message: error },
      { where: { id }, returning: true }
    );

    // Define and return model response.
    const afterhandlerEntity = afterhandlerRaw && new AfterhandlerEntity(afterhandlerRaw);
    const modelResponse = { data: afterhandlerEntity, meta: { updatedRowsCount } };
    return modelResponse;
  }
}
