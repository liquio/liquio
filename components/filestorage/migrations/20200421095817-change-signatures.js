// Export.
module.exports = {
  /**
   * Migarte up.
   * Change signatures table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('signatures', 'signed_data', {
      allowNull: false,
      type: Sequelize.TEXT
    });
  },

  /**
   * Migarte down.
   * Change signatures table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('signatures', 'signed_data', {
      allowNull: false,
      type: Sequelize.STRING
    });
  }
};
