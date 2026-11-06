// Export.
module.exports = {
  /**
   * Migarte up.
   * Create containers table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('containers', {
      id: {
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        type: Sequelize.INTEGER
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.STRING
      },
      parent_id: {
        type: Sequelize.INTEGER,
        references: { model: 'containers', key: 'id' }
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
      queryInterface.addIndex('containers', ['id'], { indicesType: 'unique' });
      queryInterface.addIndex('containers', ['name', 'parent_id'], { indicesType: 'unique' });
    }).then(() => {
      const now = new Date();
      queryInterface.bulkInsert('containers', [{
        id: 1,
        name: 'default',
        description: 'Default container',
        meta: '{}',
        created_by: 'system',
        updated_by: 'system',
        created_at: now,
        updated_at: now
      }], {});
    });
  },

  /**
   * Migarte down.
   * Drop containers table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  down: (queryInterface) => {
    return queryInterface.dropTable('containers');
  }
};
