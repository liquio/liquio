module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS user_services_provider_provider_id_uidx
        ON public.user_services USING btree (provider, provider_id);
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS public.user_services_provider_provider_id_uidx;
    `);
  },
};
