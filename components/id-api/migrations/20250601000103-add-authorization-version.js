// Credential version of a user. A password mutation increments `users.authorizationVersion`,
// so every session, code and token stamped with an older version is rejected.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of ['users', 'access_tokens', 'refresh_tokens', 'auth_codes']) {
        await queryInterface.addColumn(table, 'authorizationVersion', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }, { transaction });
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of ['auth_codes', 'refresh_tokens', 'access_tokens', 'users']) {
        await queryInterface.removeColumn(table, 'authorizationVersion', { transaction });
      }
    });
  },
};
