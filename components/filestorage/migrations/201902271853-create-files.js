// Export.
module.exports = {
  /**
   * Migarte up.
   * Create files table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('files', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV1
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING
      },
      content_type: {
        type: Sequelize.STRING
      },
      content_length: {
        type: Sequelize.INTEGER
      },
      description: {
        type: Sequelize.STRING
      },
      container_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: 'containers', key: 'id' }
      },
      data: {
        allowNull: false,
        type: Sequelize.BLOB
      },
      hash: {
        allowNull: false,
        type: Sequelize.JSON,
        defaultValue: {
          md5: null,
          sha1: null
        }
      },
      meta: {
        allowNull: false,
        type: Sequelize.JSON,
        defaultValue: {}
      },
      created_by: {
        allowNull: false,
        type: Sequelize.STRING
      },
      updated_by: {
        allowNull: false,
        type: Sequelize.STRING
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    }).then(() => {
      queryInterface.addIndex('files', ['id'], { indicesType: 'unique' });
    });
  },

  /**
   * Migarte down.
   * Drop files table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  down: (queryInterface) => {
    return queryInterface.dropTable('files');
  }
};
