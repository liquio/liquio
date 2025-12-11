const AbstractDB = require('./DB');
const SettingsModel = require('./settings');
const Settings = new SettingsModel().Settings;

const EventsModel = class extends AbstractDB {
  constructor() {
    super();
    this.events = this.sequelize.define(
      'events',
      {
        event_id: {
          type: this.DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: this.DataTypes.STRING,
          allowNull: true,
        },
        description: {
          type: this.DataTypes.TEXT,
          allowNull: true,
        },
        out_event_id: {
          type: this.DataTypes.INTEGER,
          allowNull: true,
        },
        enable: {
          type: this.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        private: {
          type: this.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        timestamps: false,
        tableName: 'events',
      },
    );

    this.events.hasMany(Settings, { foreignKey: 'event_id' });
  }

  get Events() {
    return this.events;
  }
};

module.exports = EventsModel;
