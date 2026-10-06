// Export.
module.exports = {
  /**
   * Migarte up.
   * Add preview column to files table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('files', 'folder', {
      allowNull: true,
      type: Sequelize.STRING
    });
  },

  /**
   * Migarte down.
   * Remove preview column from files table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  down: (queryInterface) => {
    return queryInterface.removeColumn('files', 'folder');
  }
};
