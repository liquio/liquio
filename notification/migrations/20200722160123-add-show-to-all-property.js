// Export.
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('users_messages', 'show_to_all', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
    } catch (error) {
      console.log('Migration skipped:', error?.message);
    }
  },

  async down(queryInterface) {
    queryInterface.removeColumn('users_messages', 'show_to_all');
  }
};
