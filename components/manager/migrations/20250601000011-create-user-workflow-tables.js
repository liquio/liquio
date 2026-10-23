module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Create user_inboxes table
      CREATE TABLE public.user_inboxes (
          id uuid NOT NULL,
          user_id character varying(255) NOT NULL,
          document_id uuid NOT NULL,
          name character varying(255),
          number character varying(255),
          is_read boolean DEFAULT false NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          meta jsonb DEFAULT '{}'::jsonb NOT NULL
      );

      -- Create user_settings table
      CREATE TABLE public.user_settings (
          id uuid NOT NULL,
          user_id character varying(255) NOT NULL,
          data jsonb DEFAULT '{}'::jsonb NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Create users_ids_map table
      CREATE TABLE public.users_ids_map (
          "userId" character varying(24),
          "newUserId" character varying
      );

      -- Create workflow_debug table
      CREATE TABLE public.workflow_debug (
          id character varying(32) NOT NULL,
          workflow_id uuid NOT NULL,
          service_name public.enum_workflow_debug_service_name NOT NULL,
          data jsonb,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Create workflow_errors table and its sequence
      CREATE SEQUENCE public.workflow_errors_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.workflow_errors (
          id integer NOT NULL,
          service_name character varying(255) NOT NULL,
          data json NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          workflow_id uuid,
          type public.enum_workflow_errors_type DEFAULT 'error'::public.enum_workflow_errors_type NOT NULL
      );

      -- Link sequence to workflow_errors table
      ALTER SEQUENCE public.workflow_errors_id_seq OWNED BY public.workflow_errors.id;
      ALTER TABLE ONLY public.workflow_errors ALTER COLUMN id SET DEFAULT nextval('public.workflow_errors_id_seq'::regclass);

      -- Create workflow_history table
      CREATE TABLE public.workflow_history (
          id uuid NOT NULL,
          workflow_template_id integer NOT NULL,
          user_id character varying(255) NOT NULL,
          data text,
          version character varying(255),
          is_current_version boolean DEFAULT false NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          meta jsonb DEFAULT '{}'::jsonb NOT NULL,
          name character varying(255),
          description character varying(255)
      );

      -- Add primary key constraints for user and workflow tables
      ALTER TABLE ONLY public.user_settings ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.workflow_errors ADD CONSTRAINT workflow_errors_pkey PRIMARY KEY (id);
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.workflow_history;
      DROP TABLE IF EXISTS public.workflow_errors;
      DROP SEQUENCE IF EXISTS public.workflow_errors_id_seq;
      DROP TABLE IF EXISTS public.workflow_debug;
      DROP TABLE IF EXISTS public.users_ids_map;
      DROP TABLE IF EXISTS public.user_settings;
      DROP TABLE IF EXISTS public.user_inboxes;
    `);
  }
};
