module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Create workflow_restarts table and its sequence
      CREATE SEQUENCE public.workflow_restarts_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.workflow_restarts (
          id integer NOT NULL,
          workflow_id uuid,
          workflow_error_id integer,
          type public.enum_workflow_restarts_type NOT NULL,
          data jsonb DEFAULT '{}'::jsonb NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to workflow_restarts table
      ALTER SEQUENCE public.workflow_restarts_id_seq OWNED BY public.workflow_restarts.id;
      ALTER TABLE ONLY public.workflow_restarts ALTER COLUMN id SET DEFAULT nextval('public.workflow_restarts_id_seq'::regclass);

      -- Create workflow_statuses table and its sequence
      CREATE SEQUENCE public.workflow_statuses_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.workflow_statuses (
          id integer NOT NULL,
          name character varying(255) NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to workflow_statuses table
      ALTER SEQUENCE public.workflow_statuses_id_seq OWNED BY public.workflow_statuses.id;
      ALTER TABLE ONLY public.workflow_statuses ALTER COLUMN id SET DEFAULT nextval('public.workflow_statuses_id_seq'::regclass);

      -- Create workflow_template_categories table and its sequence
      CREATE SEQUENCE public.workflow_template_categories_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.workflow_template_categories (
          id integer NOT NULL,
          parent_id integer,
          name character varying(255) NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to workflow_template_categories table
      ALTER SEQUENCE public.workflow_template_categories_id_seq OWNED BY public.workflow_template_categories.id;
      ALTER TABLE ONLY public.workflow_template_categories ALTER COLUMN id SET DEFAULT nextval('public.workflow_template_categories_id_seq'::regclass);

      -- Create trigger for workflow_template_categories table
      CREATE TRIGGER workflow_template_category_notify 
        AFTER INSERT OR DELETE OR UPDATE
        ON public.workflow_template_categories 
        FOR EACH ROW 
        EXECUTE FUNCTION generic_notify_event('workflow_template_category_row_change_notify');

      -- Create workflow_template_tag_map table
      CREATE TABLE public.workflow_template_tag_map (
          workflow_template_id integer NOT NULL,
          workflow_template_tag_id integer NOT NULL
      );

      -- Create workflow_template_tags table and its sequence
      CREATE SEQUENCE public.workflow_template_tags_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.workflow_template_tags (
          id integer NOT NULL,
          name character varying(255) NOT NULL,
          color character varying(255) NOT NULL,
          description text,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          created_by character varying(255) DEFAULT 'system'::character varying NOT NULL,
          updated_by character varying(255) DEFAULT 'system'::character varying NOT NULL
      );

      -- Link sequence to workflow_template_tags table
      ALTER SEQUENCE public.workflow_template_tags_id_seq OWNED BY public.workflow_template_tags.id;
      ALTER TABLE ONLY public.workflow_template_tags ALTER COLUMN id SET DEFAULT nextval('public.workflow_template_tags_id_seq'::regclass);

      -- Add primary key constraints
      ALTER TABLE ONLY public.workflow_restarts ADD CONSTRAINT workflow_restarts_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.workflow_statuses ADD CONSTRAINT workflow_statuses_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.workflow_template_categories ADD CONSTRAINT workflow_template_categories_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.workflow_template_tags ADD CONSTRAINT workflow_template_tags_pkey PRIMARY KEY (id);
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS workflow_template_category_notify ON public.workflow_template_categories;
      DROP TABLE IF EXISTS public.workflow_template_tags;
      DROP SEQUENCE IF EXISTS public.workflow_template_tags_id_seq;
      DROP TABLE IF EXISTS public.workflow_template_tag_map;
      DROP TABLE IF EXISTS public.workflow_template_categories;
      DROP SEQUENCE IF EXISTS public.workflow_template_categories_id_seq;
      DROP TABLE IF EXISTS public.workflow_statuses;
      DROP SEQUENCE IF EXISTS public.workflow_statuses_id_seq;
      DROP TABLE IF EXISTS public.workflow_restarts;
      DROP SEQUENCE IF EXISTS public.workflow_restarts_id_seq;
    `);
  }
};
