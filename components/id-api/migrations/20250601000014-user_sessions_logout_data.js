module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      ALTER TABLE public.user_sessions
        ADD COLUMN IF NOT EXISTS logout_data jsonb NULL;
    `);
  },
  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      ALTER TABLE public.user_sessions
        DROP COLUMN IF EXISTS logout_data;
    `);
  },
};
