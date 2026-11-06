module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_keys_access_mode') THEN
          CREATE TYPE public.enum_keys_access_mode AS ENUM (
            'full',
            'read_only',
            'write_only'
          );
        END IF;
      END
      $$;
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS public.enum_keys_access_mode;
    `);
  },
}; 