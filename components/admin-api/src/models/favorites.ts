import Sequelize from 'sequelize';

import { Model } from './model';

export class FavoritesModel extends Model {
  static singleton: FavoritesModel;

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
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      FavoritesModel.singleton = this;
    }

    return FavoritesModel.singleton;
  }
}
