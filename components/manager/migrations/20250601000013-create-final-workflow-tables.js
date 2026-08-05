module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Create workflow_templates table and its sequence
      CREATE SEQUENCE public.workflow_templates_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.workflow_templates (
          id integer NOT NULL,
          workflow_template_category_id integer,
          name character varying(255) NOT NULL,
          description character varying(255),
          xml_bpmn_schema text NOT NULL,
          data json DEFAULT '{}'::json NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          is_active boolean DEFAULT false NOT NULL,
          access_units integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
          errors_subscribers jsonb[] DEFAULT ARRAY[]::jsonb[] NOT NULL
      );

      -- Link sequence to workflow_templates table
      ALTER SEQUENCE public.workflow_templates_id_seq OWNED BY public.workflow_templates.id;
      ALTER TABLE ONLY public.workflow_templates ALTER COLUMN id SET DEFAULT nextval('public.workflow_templates_id_seq'::regclass);

      -- Create trigger for workflow_templates table
      CREATE TRIGGER workflow_template_notify 
        AFTER INSERT OR DELETE OR UPDATE
        ON public.workflow_templates 
        FOR EACH ROW 
        EXECUTE FUNCTION generic_notify_event('workflow_template_row_change_notify');

      -- Create workflows table
      CREATE TABLE public.workflows (
          id uuid NOT NULL,
          workflow_template_id integer NOT NULL,
          name character varying(255),
          is_final boolean DEFAULT false NOT NULL,
          cancellation_type_id integer,
          created_by character varying(255) NOT NULL,
          updated_by character varying(255) NOT NULL,
          data jsonb DEFAULT '{}'::json NOT NULL,
          due_date timestamp with time zone,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          workflow_status_id integer,
          number character varying(255),
          user_data json,
          has_unresolved_errors boolean DEFAULT false NOT NULL,
          created_by_unit_heads integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
          created_by_units integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
          observer_units integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
          is_personal boolean DEFAULT true NOT NULL,
          parent_id uuid,
          created_by_ipn character varying(255),
          statuses jsonb DEFAULT '{}'::jsonb NOT NULL,
          elastic_reindex_state public.workflows_elastic_reindex_state
      );

      -- Add primary key constraints for final workflow tables
      ALTER TABLE ONLY public.workflow_templates ADD CONSTRAINT workflow_templates_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.workflows ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS workflow_template_notify ON public.workflow_templates;
      DROP TABLE IF EXISTS public.workflows;
      DROP TABLE IF EXISTS public.workflow_templates;
      DROP SEQUENCE IF EXISTS public.workflow_templates_id_seq;
    `);
  }
};
