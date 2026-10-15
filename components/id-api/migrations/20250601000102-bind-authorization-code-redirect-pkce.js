module.exports = {
  async up(queryInterface, Sequelize) {
    // Legacy rows keep NULL values: the OAuth model fails closed for a code without a redirect URI binding,
    // and such codes expire within minutes.
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('auth_codes', 'redirectUri', { type: Sequelize.TEXT, allowNull: true }, { transaction });
      await queryInterface.addColumn('auth_codes', 'codeChallenge', { type: Sequelize.STRING(128), allowNull: true }, { transaction });
      await queryInterface.addColumn('auth_codes', 'codeChallengeMethod', { type: Sequelize.STRING, allowNull: true }, { transaction });
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
