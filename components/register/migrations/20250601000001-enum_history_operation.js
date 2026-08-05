module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_history_operation') THEN
          CREATE TYPE public.enum_history_operation AS ENUM (
            'create',
            'update',
            'delete'
          );
        END IF;
      END
      $$;
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS public.enum_history_operation;
    `);
  },
}; 