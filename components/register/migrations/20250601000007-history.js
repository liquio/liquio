module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.history (
        id uuid NOT NULL,
        record_id uuid NOT NULL,
        operation public.enum_history_operation NOT NULL,
        data jsonb DEFAULT '{}'::json NOT NULL,
        created_by varchar(255) NOT NULL,
        updated_by varchar(255) NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        person jsonb DEFAULT '{"id": null, "name": null}'::jsonb NOT NULL,
        meta jsonb DEFAULT '{}'::jsonb NOT NULL,
        register_id integer,
        key_id integer,
        CONSTRAINT history_pkey PRIMARY KEY (id)
      );
      CREATE INDEX IF NOT EXISTS history_created_by ON public.history USING btree (created_by);
      CREATE INDEX IF NOT EXISTS history_id ON public.history USING btree (id);
      CREATE INDEX IF NOT EXISTS history_key_id ON public.history USING btree (key_id);
      CREATE INDEX IF NOT EXISTS history_record_id ON public.history USING btree (record_id);
      CREATE INDEX IF NOT EXISTS history_register_id ON public.history USING btree (register_id);
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.history;
    `);
  },
}; 