module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('auth_codes', 'redirectUri', { type: Sequelize.TEXT, allowNull: true }, { transaction });
      await queryInterface.addColumn('auth_codes', 'codeChallenge', { type: Sequelize.STRING(128), allowNull: true }, { transaction });
      await queryInterface.addColumn('auth_codes', 'codeChallengeMethod', { type: Sequelize.STRING, allowNull: true }, { transaction });

      // Existing codes have no recoverable redirect URI or PKCE binding.
      await queryInterface.sequelize.query('DELETE FROM auth_codes;', { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('auth_codes', 'codeChallengeMethod', { transaction });
      await queryInterface.removeColumn('auth_codes', 'codeChallenge', { transaction });
      await queryInterface.removeColumn('auth_codes', 'redirectUri', { transaction });
    });
  },
};
