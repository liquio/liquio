module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.records (
        id uuid NOT NULL,
        register_id integer NOT NULL,
        key_id integer NOT NULL,
        data jsonb DEFAULT '{}'::json NOT NULL,
        meta json DEFAULT '{}'::json NOT NULL,
        created_by varchar(255) NOT NULL,
        updated_by varchar(255) NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        allow_tokens varchar(255)[] DEFAULT ARRAY[]::varchar(255)[] NOT NULL,
        search_string varchar(1024),
        search_string_2 varchar(1024),
        search_string_3 varchar(1024),
        signature text,
        is_encrypted boolean DEFAULT false NOT NULL,
        CONSTRAINT records_pkey PRIMARY KEY (id),
        CONSTRAINT records_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.keys(id),
        CONSTRAINT records_register_id_fkey FOREIGN KEY (register_id) REFERENCES public.registers(id)
      );
      CREATE INDEX IF NOT EXISTS idx_records_key_id_created_at ON public.records USING btree (key_id, created_at);
      CREATE INDEX IF NOT EXISTS records_allow_tokens ON public.records USING btree (allow_tokens);
      CREATE INDEX IF NOT EXISTS records_created_at ON public.records USING btree (created_at);
      CREATE INDEX IF NOT EXISTS records_id ON public.records USING btree (id);
      CREATE INDEX IF NOT EXISTS records_key_id ON public.records USING btree (key_id);
      CREATE INDEX IF NOT EXISTS records_register_id ON public.records USING btree (register_id);
      CREATE INDEX IF NOT EXISTS records_register_id_key_id ON public.records USING btree (register_id, key_id);
      CREATE INDEX IF NOT EXISTS records_search_string ON public.records USING btree (search_string);
      CREATE INDEX IF NOT EXISTS records_search_string_2 ON public.records USING btree (search_string_2);
      CREATE INDEX IF NOT EXISTS records_search_string_3 ON public.records USING btree (search_string_3);
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.records;
    `);
  },
}; 