module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Create ui_filters table and its sequence
      CREATE SEQUENCE public.ui_filters_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.ui_filters (
          id integer NOT NULL,
          name character varying(255) NOT NULL,
          filter character varying(255) NOT NULL,
          is_active boolean DEFAULT true NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to ui_filters table
      ALTER SEQUENCE public.ui_filters_id_seq OWNED BY public.ui_filters.id;
      ALTER TABLE ONLY public.ui_filters ALTER COLUMN id SET DEFAULT nextval('public.ui_filters_id_seq'::regclass);

      -- Create unit_access table and its sequence
      CREATE SEQUENCE public.unit_access_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.unit_access (
          id integer NOT NULL,
          unit_id integer,
          type public.enum_unit_access_type NOT NULL,
          data jsonb DEFAULT '{}'::jsonb NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          meta jsonb DEFAULT '{}'::jsonb NOT NULL
      );

      -- Link sequence to unit_access table
      ALTER SEQUENCE public.unit_access_id_seq OWNED BY public.unit_access.id;
      ALTER TABLE ONLY public.unit_access ALTER COLUMN id SET DEFAULT nextval('public.unit_access_id_seq'::regclass);

      -- Create trigger for unit_access table
      CREATE TRIGGER unit_access_notify 
        AFTER INSERT OR DELETE OR UPDATE
        ON public.unit_access 
        FOR EACH ROW 
        EXECUTE FUNCTION generic_notify_event('unit_access_row_change_notify');

      -- Create unit_rules table and its sequence
      CREATE SEQUENCE public.unit_rules_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.unit_rules (
          id integer NOT NULL,
          unit_rule_type public.enum_unit_rules_unit_rule_type NOT NULL,
          rule_schema jsonb DEFAULT '{}'::jsonb NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to unit_rules table
      ALTER SEQUENCE public.unit_rules_id_seq OWNED BY public.unit_rules.id;
      ALTER TABLE ONLY public.unit_rules ALTER COLUMN id SET DEFAULT nextval('public.unit_rules_id_seq'::regclass);

      -- Create units table and its sequence
      CREATE SEQUENCE public.units_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.units (
          id integer NOT NULL,
          parent_id integer,
          name character varying(255) NOT NULL,
          description character varying(255) NOT NULL,
          members character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
          heads character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
          data json DEFAULT '{}'::json NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          menu_config json DEFAULT '{}'::json NOT NULL,
          allow_tokens character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[] NOT NULL,
          heads_ipn character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
          members_ipn character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
          based_on integer[] DEFAULT ARRAY[]::integer[],
          requested_members jsonb[] DEFAULT ARRAY[]::jsonb[] NOT NULL
      );

      -- Link sequence to units table
      ALTER SEQUENCE public.units_id_seq OWNED BY public.units.id;
      ALTER TABLE ONLY public.units ALTER COLUMN id SET DEFAULT nextval('public.units_id_seq'::regclass);

      -- Create triggers for units table
      CREATE TRIGGER units_notify 
        AFTER INSERT OR DELETE OR UPDATE
        ON public.units 
        FOR EACH ROW 
        EXECUTE FUNCTION generic_notify_event('units_row_change_notify');

      CREATE TRIGGER update_access_history_raw_trigger 
        AFTER UPDATE OF heads, heads_ipn, members, members_ipn
        ON public.units 
        FOR EACH ROW 
        EXECUTE FUNCTION update_access_history_raw_function();

      -- Add primary key constraints for unit tables
      ALTER TABLE ONLY public.ui_filters ADD CONSTRAINT ui_filters_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.unit_access ADD CONSTRAINT unit_access_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.unit_rules ADD CONSTRAINT unit_rules_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.units ADD CONSTRAINT units_pkey PRIMARY KEY (id);
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS unit_access_notify ON public.unit_access;
      DROP TRIGGER IF EXISTS units_notify ON public.units;
      DROP TRIGGER IF EXISTS update_access_history_raw_trigger ON public.units;
      DROP TABLE IF EXISTS public.units;
      DROP SEQUENCE IF EXISTS public.units_id_seq;
      DROP TABLE IF EXISTS public.unit_rules;
      DROP SEQUENCE IF EXISTS public.unit_rules_id_seq;
      DROP TABLE IF EXISTS public.unit_access;
      DROP SEQUENCE IF EXISTS public.unit_access_id_seq;
      DROP TABLE IF EXISTS public.ui_filters;
      DROP SEQUENCE IF EXISTS public.ui_filters_id_seq;
    `);
  }
};
