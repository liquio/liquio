// Import.
import Sequelize from 'sequelize';

import Model from './model';

/**
 * Documents model.
 */
class DocumentModel extends Model {
  /**
   * Constructor.
   */
  constructor() {
    super();

    if (!DocumentModel.singleton) {
      this.model = this.db.define(
        'links',
        {
          key: { type: Sequelize.STRING, allowNull: false, unique: true },
          data: { type: Sequelize.TEXT, allowNull: false },
        },
        {
          tableName: 'links',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      DocumentModel.singleton = this;
    }

    return DocumentModel.singleton;
  }
}

// Export.
export default DocumentModel;
