const AbstractDB = require('./DB');
const CommunicationModel = require('./communications');
const UserSubscribesModel = require('./user_subscribes');
const Communication = new CommunicationModel().Communications,
  { UserSubscribes } = new UserSubscribesModel();

const SettingsModel = class extends AbstractDB {
  constructor() {
    super();
    this.settings = this.sequelize.define(
      'settings',
      {
        setting_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        event_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'events',
            key: 'event_id',
          },
        },
        communication_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'communications',
            key: 'communication_id',
          },
        },
        enable: {
          type: this.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        timestamps: false,
        tableName: 'settings',
      },
    );

    this.settings.belongsTo(Communication, { foreignKey: 'communication_id' });
    this.settings.hasMany(UserSubscribes, { foreignKey: 'setting_id' });
  }

  get Settings() {
    return this.settings;
  }
};

module.exports = SettingsModel;
