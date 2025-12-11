const Sequelize = require('sequelize');

const Model = require('./model');
const KycEntity = require('../entities/kyc_session');

class KycSessionModel extends Model {
  constructor() {
    if (!KycSessionModel.singleton) {
      super();

      this.model = this.db.define(
        'kyc_session',
        {
          // Internal ID.
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
          },
          // KYC provider name.
          provider: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          // Provider session ID.
          sessionId: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          // User ID.
          userId: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          // An URL to redirect user to start the KYC session.
          redirectUrl: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          // An URL to redirect user after KYC session is completed.
          returnUrl: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          // Processed session data.
          data: {
            allowNull: true,
            type: Sequelize.JSON,
          },
          // KYC session status.
          status: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          // KYC session creation time.
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          // KYC session last update time.
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        {
          tableName: 'kyc_sessions',
          createdAt: 'createdAt',
          updatedAt: 'updatedAt',
        }
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      KycSessionModel.singleton = this;
    }

    return KycSessionModel.singleton;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {KycEntity}
   */
  prepareEntity(item) {
    return new KycEntity({
      id: item.id,
      provider: item.provider,
      sessionId: item.sessionId,
      userId: item.userId,
      redirectUrl: item.redirectUrl,
      returnUrl: item.returnUrl,
      status: item.status,
      data: item.data,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }
}

module.exports = KycSessionModel;
