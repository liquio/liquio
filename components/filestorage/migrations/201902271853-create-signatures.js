// Export.
module.exports = {
  /**
   * Migarte up.
   * Create signatures table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('signatures', {
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
      signed_data: {
        allowNull: false,
        type: Sequelize.STRING
      },
      signature: {
        allowNull: false,
        type: Sequelize.STRING
      },
      certificate: {
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
      queryInterface.addIndex('signatures', ['id'], { indicesType: 'unique' });
    });
  },

  /**
   * Migarte down.
   * Drop signatures table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  down: (queryInterface) => {
    return queryInterface.dropTable('signatures');
  }
};
