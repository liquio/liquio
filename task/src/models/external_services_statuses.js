
const Sequelize = require('sequelize');
const Model = require('./model');
const ExternalServiceStatusEntity = require('../entities/external_service_status');


class ExternalServicesStatusesModel extends Model {
  constructor() {
    // Singleton.
    if (!ExternalServicesStatusesModel.singleton) {
      // Call parent constructor.
      super();

      // Sequelize model.
      this.model = this.db.define(
        'external_services_statuses',
        {
          id: { allowNull: false, primaryKey: true, type: Sequelize.UUIDV4, defaultValue: Sequelize.UUIDV4 },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE },
          service: { allowNull: false, type: Sequelize.STRING(255) },
          request_user: { allowNull: false, type: Sequelize.STRING(255) },
          request_ip: { allowNull: false, type: Sequelize.STRING(255) },
          request_body: { allowNull: false, type: Sequelize.TEXT, },
          state: { allowNull: false, type: Sequelize.ENUM, values: [ 'received', 'pending', 'fulfilled', 'rejected' ] },
          rejected_reason: { allowNull: true, type: Sequelize.TEXT, }
        },
        {
          tableName: 'external_services_statuses',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      // Define singleton.
      ExternalServicesStatusesModel.singleton = this;
    }

    // Return singleton.
    return ExternalServicesStatusesModel.singleton;
  }

  /**
   * @param {number} intervalInMinutes
   * @return {Promise<void>}
   */
  async setReceivedState(intervalInMinutes = 15) {
    const query = `
      UPDATE external_services_statuses 
      SET state = 'received', updated_at = now() 
      WHERE state = 'pending' AND updated_at < now() - interval :interval;
    `;

    try {
      await this.db.query(query, { replacements: { interval: `${intervalInMinutes} minutes` } });
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }
  }

  /**
   * @param {number} limit
   * @return {Promise<Array<ExternalServiceStatusEntity>>}
   */
  async getWithReceivedState(limit = 10) {
    // UPDATE query instead of SELECT to avoid a race condition between multiple bpmn-task instances.
    const query = `
      UPDATE external_services_statuses
      SET state = 'pending', updated_at = now()
      WHERE id IN (SELECT id FROM external_services_statuses WHERE state = 'received' ORDER BY created_at LIMIT :limit FOR UPDATE)
      RETURNING *;
    `;
    let statuses;
    try {
      const [ results ] = await this.db.query(query, { replacements: { limit: limit } });
      statuses = results;
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    return statuses.map(this.prepareEntity);
  }

  /**
   * @param {Array<string>} ids
   * @return {Promise<void>}
   */
  async setFulfilledState(ids) {
    await this.model.update(
      {
        state: 'fulfilled',
        rejected_reason: null
      },
      {
        where: { id: { [Sequelize.Op.in]: ids } }
      }
    );
  }

  /**
   * @param {Array<ExternalServiceStatusEntity>} statuses
   * @return {Promise<void>}
   */
  async setRejectedState(statuses) {
    await Promise.all(statuses.map(status => this.model.update(
      {
        state: 'rejected',
        rejected_reason: status.rejectedReason
      },
      {
        where: { id: status.id }
      }
    )));
  }

  /**
   * @param {ExternalServiceStatusEntity} status
   * @return {Promise<ExternalServiceStatusEntity>}
   */
  async create(status) {
    let createdStatus;
    try {
      createdStatus = await this.model.create(this.prepareForModel(status));
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    return new ExternalServiceStatusEntity(createdStatus);
  }

  prepareEntity(item) {
    return new ExternalServiceStatusEntity({
      id: item.id,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      service: item.service,
      requestUser: item.request_user,
      requestIp: item.request_ip,
      requestBody: item.request_body,
      state: item.state,
      rejectedReason: item.rejected_reason
    });
  }

  prepareForModel(item) {
    return {
      service: item.service,
      request_user: item.requestUser,
      request_ip: item.requestIp,
      request_body: item.requestBody,
      state: item.state,
      rejected_reason: item.rejectedReason
    };
  }
}

module.exports = ExternalServicesStatusesModel;
