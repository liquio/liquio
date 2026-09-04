import Sequelize from 'sequelize';

import { Model } from './model';
import { FileLibraryGrantEntity } from '../entities/file_library_grant';

export class FileLibraryGrantModel extends Model {
  static singleton: FileLibraryGrantModel;

  constructor(dbInstance?) {
    if (!FileLibraryGrantModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'file_library_grant',
        {
          id: {
            type: Sequelize.UUID,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4,
            allowNull: false,
          },
          item_id: {
            type: Sequelize.UUID,
            allowNull: false,
          },
          subject_type: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          subject_id: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          permission: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'read',
          },
          inherit: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          created_by: {
            type: Sequelize.STRING,
            allowNull: false,
          },
        },
        {
          tableName: 'file_library_grants',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      FileLibraryGrantModel.singleton = this;
    }

    return FileLibraryGrantModel.singleton;
  }

  prepareEntity(raw) {
    return raw ? new FileLibraryGrantEntity(raw.get ? raw.get({ plain: true }) : raw) : null;
  }
}
