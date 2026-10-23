module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.afterhandlers (
        id uuid NOT NULL,
        type public.enum_afterhandlers_type NOT NULL,
        history_id uuid,
        synced boolean DEFAULT false NOT NULL,
        created_by varchar(255) NOT NULL,
        updated_by varchar(255) NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        has_error boolean DEFAULT false NOT NULL,
        error_message text,
        CONSTRAINT afterhandlers_pkey PRIMARY KEY (id),
        CONSTRAINT afterhandlers_history_id_fkey FOREIGN KEY (history_id) REFERENCES public.history(id)
      );
      CREATE INDEX IF NOT EXISTS afterhandlers_created_at ON public.afterhandlers USING btree (created_at);
      CREATE INDEX IF NOT EXISTS afterhandlers_created_by ON public.afterhandlers USING btree (created_by);
      CREATE INDEX IF NOT EXISTS afterhandlers_has_error ON public.afterhandlers USING btree (has_error);
      CREATE INDEX IF NOT EXISTS afterhandlers_history_id ON public.afterhandlers USING btree (history_id);
      CREATE INDEX IF NOT EXISTS afterhandlers_id ON public.afterhandlers USING btree (id);
      CREATE INDEX IF NOT EXISTS afterhandlers_synced ON public.afterhandlers USING btree (synced);
      CREATE INDEX IF NOT EXISTS afterhandlers_type ON public.afterhandlers USING btree (type);
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.afterhandlers;
    `);
  },
}; 