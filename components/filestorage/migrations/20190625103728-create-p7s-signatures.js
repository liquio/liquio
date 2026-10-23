// Export.
module.exports = {
  /**
   * Migarte up.
   * Create P7S signatures table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('p7s_signatures', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV1
      },
      file_id: {
        allowNull: false,
        type: Sequelize.UUID,
        references: { model: 'files', key: 'id' }
      },
      p7s: {
        allowNull: false,
        type: Sequelize.STRING
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
      queryInterface.addIndex('p7s_signatures', ['id'], { indicesType: 'unique' });
      queryInterface.addIndex('p7s_signatures', ['file_id'], { indicesType: 'unique' });
    });
  },

  /**
   * Migarte down.
   * Drop P7S signatures table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  down: (queryInterface) => {
    return queryInterface.dropTable('p7s_signatures');
  }
};
