const Sequelize = require('sequelize');
const Model = require('./model');

class FavoritesModel extends Model {
  constructor() {
    if (!FavoritesModel.singleton) {
      super();

      this.model = this.db.define(
        'favorites',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          user_id: Sequelize.STRING,
          name: Sequelize.STRING,
          entity_type: Sequelize.STRING,
          entity_id: Sequelize.STRING,
        },
        {
          tableName: 'favorites',
          underscored: true,
          created_at: 'created_at',
          updated_at: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      FavoritesModel.singleton = this;
    }

    return FavoritesModel.singleton;
  }
}

module.exports = FavoritesModel;
