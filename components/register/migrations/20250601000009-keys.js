module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.keys (
        id integer NOT NULL,
        register_id integer,
        name varchar(255) NOT NULL,
        description varchar(255) NOT NULL,
        schema json DEFAULT '{}'::json NOT NULL,
        parent_id integer,
        meta json DEFAULT '{}'::json NOT NULL,
        created_by varchar(255) NOT NULL,
        updated_by varchar(255) NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        to_string text NOT NULL,
        to_search_string text DEFAULT '(record) => { return null; }'::text,
        to_export text DEFAULT '(record) => { return null; }'::text,
        access_mode public.enum_keys_access_mode DEFAULT 'full'::public.enum_keys_access_mode NOT NULL,
        is_encrypted boolean DEFAULT false NOT NULL,
        CONSTRAINT keys_pkey PRIMARY KEY (id),
        CONSTRAINT keys_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.keys(id),
        CONSTRAINT keys_register_id_fkey FOREIGN KEY (register_id) REFERENCES public.registers(id)
      );
      ALTER TABLE ONLY public.keys ALTER COLUMN id SET DEFAULT nextval('public.keys_id_seq'::regclass);
      ALTER SEQUENCE public.keys_id_seq OWNED BY public.keys.id;
      CREATE INDEX IF NOT EXISTS keys_id ON public.keys USING btree (id);
      CREATE INDEX IF NOT EXISTS keys_name_register_id ON public.keys USING btree (name, register_id);
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.keys;
    `);
  },
}; 