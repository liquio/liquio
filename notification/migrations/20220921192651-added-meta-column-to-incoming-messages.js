// Export.
module.exports = {
  /**
   * Migrate up.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('incomming_messages', 'meta', {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {}
      });
    } catch (error) {
      console.log('Migration skipped:', error?.message);
    }
  },

  /**
   * Migrate down.
   * @param {object} queryInterface Query interface.
   * @param {object} Sequelize Sequelize class.
   */
  async down(queryInterface) {
    await queryInterface.removeColumn('incomming_messages', 'meta');
  }
};
