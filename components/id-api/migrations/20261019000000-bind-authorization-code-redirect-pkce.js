module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Both branch histories introduced these columns; support databases migrated from either branch.
      const columns = await queryInterface.describeTable('auth_codes', { transaction });
      if (!columns.redirectUri) {
        await queryInterface.addColumn('auth_codes', 'redirectUri', { type: Sequelize.TEXT, allowNull: true }, { transaction });
      }
      if (!columns.codeChallenge) {
        await queryInterface.addColumn('auth_codes', 'codeChallenge', { type: Sequelize.STRING(128), allowNull: true }, { transaction });
      }
      if (!columns.codeChallengeMethod) {
        await queryInterface.addColumn('auth_codes', 'codeChallengeMethod', { type: Sequelize.STRING, allowNull: true }, { transaction });
      }

      // Existing codes have no recoverable redirect URI or PKCE binding.
      await queryInterface.sequelize.query('DELETE FROM auth_codes;', { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Both branch histories introduced these columns; support databases migrated from either branch.
      const columns = await queryInterface.describeTable('auth_codes', { transaction });
      if (columns.codeChallengeMethod) await queryInterface.removeColumn('auth_codes', 'codeChallengeMethod', { transaction });
      if (columns.codeChallenge) await queryInterface.removeColumn('auth_codes', 'codeChallenge', { transaction });
      if (columns.redirectUri) await queryInterface.removeColumn('auth_codes', 'redirectUri', { transaction });
    });
  },
};
