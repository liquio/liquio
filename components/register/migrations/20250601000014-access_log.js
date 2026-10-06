module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.access_log (
        id uuid NOT NULL,
        record_id uuid NOT NULL,
        key_id integer NOT NULL,
        data jsonb DEFAULT '{}'::jsonb NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        CONSTRAINT access_log_pkey PRIMARY KEY (id),
        CONSTRAINT access_log_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.keys(id)
      );
      CREATE INDEX IF NOT EXISTS access_log_created_at ON public.access_log USING btree (created_at);
      CREATE INDEX IF NOT EXISTS access_log_key_id ON public.access_log USING btree (key_id);
      CREATE INDEX IF NOT EXISTS access_log_record_id ON public.access_log USING btree (record_id);
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.access_log;
    `);
  },
}; 