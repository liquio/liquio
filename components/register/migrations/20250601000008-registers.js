module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.registers (
        id integer NOT NULL,
        name varchar(255) NOT NULL,
        description varchar(255) NOT NULL,
        parent_id integer,
        meta json DEFAULT '{}'::json NOT NULL,
        created_by varchar(255) NOT NULL,
        updated_by varchar(255) NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        CONSTRAINT registers_pkey PRIMARY KEY (id),
        CONSTRAINT registers_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.registers(id)
      );
      ALTER TABLE ONLY public.registers ALTER COLUMN id SET DEFAULT nextval('public.registers_id_seq'::regclass);
      ALTER SEQUENCE public.registers_id_seq OWNED BY public.registers.id;
      CREATE INDEX IF NOT EXISTS registers_id ON public.registers USING btree (id);
      CREATE INDEX IF NOT EXISTS registers_name ON public.registers USING btree (name);
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.registers;
    `);
  },
}; 