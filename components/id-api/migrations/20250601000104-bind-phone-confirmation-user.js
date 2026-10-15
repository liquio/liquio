module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('confirmation_codes', 'userId', {
      type: Sequelize.STRING(24),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('confirmation_codes', 'userId');
  },
};
