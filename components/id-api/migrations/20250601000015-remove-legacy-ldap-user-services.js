module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DELETE FROM public.user_services WHERE provider = 'ldap';
    `);
  },
  async down(queryInterface, Sequelize) {
    return Promise.resolve();
  },
};
