// Export.
module.exports = {
  /**
   * Migarte up.
   * Change P7S signatures table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('p7s_signatures', 'p7s', {
      allowNull: false,
      type: Sequelize.TEXT
    });
  },

  /**
   * Migarte down.
   * Change P7S signatures table.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('p7s_signatures', 'p7s', {
      allowNull: false,
      type: Sequelize.STRING
    });
  }
};
