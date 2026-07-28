module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Create task_tags table and its sequence
      CREATE SEQUENCE public.task_tags_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.task_tags (
          id integer NOT NULL,
          name character varying(255) NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to task_tags table
      ALTER SEQUENCE public.task_tags_id_seq OWNED BY public.task_tags.id;
      ALTER TABLE ONLY public.task_tags ALTER COLUMN id SET DEFAULT nextval('public.task_tags_id_seq'::regclass);

      -- Create task_templates table and its sequence
      CREATE SEQUENCE public.task_templates_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.task_templates (
          id integer NOT NULL,
          name character varying(255) NOT NULL,
          document_template_id integer,
          json_schema text NOT NULL,
          html_template text NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to task_templates table
      ALTER SEQUENCE public.task_templates_id_seq OWNED BY public.task_templates.id;
      ALTER TABLE ONLY public.task_templates ALTER COLUMN id SET DEFAULT nextval('public.task_templates_id_seq'::regclass);

      -- Create trigger for task_templates table
      CREATE TRIGGER task_template_notify 
        AFTER INSERT OR DELETE OR UPDATE 
        ON public.task_templates FOR EACH ROW 
        EXECUTE FUNCTION public.generic_notify_event('task_template_row_change_notify');
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE public.tasks (
          id uuid NOT NULL,
          task_template_id integer NOT NULL,
          workflow_id uuid NOT NULL,
          name character varying(255),
          description character varying(255),
          document_id uuid,
          signer_users character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[] NOT NULL,
          performer_users character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[] NOT NULL,
          performer_units integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
          tags integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
          data json DEFAULT '{}'::json NOT NULL,
          cancellation_type_id integer,
          finished boolean DEFAULT false NOT NULL,
          finished_at timestamp with time zone,
          deleted boolean DEFAULT false NOT NULL,
          created_by character varying(255) DEFAULT 'system'::character varying NOT NULL,
          updated_by character varying(255) DEFAULT 'system'::character varying NOT NULL,
          due_date timestamp with time zone,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          is_entry boolean DEFAULT false,
          copy_from uuid,
          is_current boolean DEFAULT true,
          performer_usernames character varying(255)[],
          meta json DEFAULT '{"isRead":false}'::json,
          signer_usernames character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
          only_for_heads boolean DEFAULT false NOT NULL,
          is_system boolean DEFAULT false NOT NULL,
          observer_units integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
          performer_users_ipn character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[] NOT NULL,
          labels character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[] NOT NULL,
          version character varying(255),
          archived boolean DEFAULT false NOT NULL,
          archive_data jsonb DEFAULT '{}'::jsonb NOT NULL,
          activity_log jsonb DEFAULT '[]'::jsonb NOT NULL,
          required_performer_units integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
          draft_expired_at timestamp with time zone,
          performer_users_email character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[] NOT NULL
      );

      -- Create triggers for tasks table
      CREATE TRIGGER task_created 
        AFTER INSERT
        ON public.tasks 
        FOR EACH ROW 
        EXECUTE FUNCTION set_workflow_elastic_reindex_state_as_not_synced();

      CREATE TRIGGER task_updated 
        AFTER UPDATE
        ON public.tasks 
        FOR EACH ROW 
        EXECUTE FUNCTION set_workflow_elastic_reindex_state_as_not_synced();

      -- Add primary key constraints for task tables
      ALTER TABLE ONLY public.task_templates ADD CONSTRAINT task_templates_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.task_tags ADD CONSTRAINT task_tags_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.tasks ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS task_template_notify ON public.task_templates;
      DROP TRIGGER IF EXISTS task_created ON public.tasks;
      DROP TRIGGER IF EXISTS task_updated ON public.tasks;
      DROP TABLE IF EXISTS public.tasks;
      DROP TABLE IF EXISTS public.task_templates;
      DROP SEQUENCE IF EXISTS public.task_templates_id_seq;
      DROP TABLE IF EXISTS public.task_tags;
      DROP SEQUENCE IF EXISTS public.task_tags_id_seq;
    `);
  }
};
