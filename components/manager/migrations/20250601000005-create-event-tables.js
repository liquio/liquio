module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Create elastic_reindex_log table
      CREATE TABLE public.elastic_reindex_log (
          id uuid NOT NULL,
          user_id character varying(255) NOT NULL,
          user_name character varying(255) NOT NULL,
          filters jsonb,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          status public.enum_elastic_reindex_log_status DEFAULT 'running'::public.enum_elastic_reindex_log_status NOT NULL,
          error_message character varying(255)
      );

      -- Create event_templates table and its sequence
      CREATE SEQUENCE public.event_templates_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.event_templates (
          id integer NOT NULL,
          event_type_id integer NOT NULL,
          name character varying(255) NOT NULL,
          description character varying(255),
          json_schema text NOT NULL,
          html_template text,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to event_templates table
      ALTER SEQUENCE public.event_templates_id_seq OWNED BY public.event_templates.id;
      ALTER TABLE ONLY public.event_templates ALTER COLUMN id SET DEFAULT nextval('public.event_templates_id_seq'::regclass);

      -- Create trigger for event_templates table
      CREATE TRIGGER event_template_notify 
        AFTER INSERT OR DELETE OR UPDATE
        ON public.event_templates 
        FOR EACH ROW 
        EXECUTE FUNCTION generic_notify_event('event_template_row_change_notify');

      -- Create event_types table and its sequence
      CREATE SEQUENCE public.event_types_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.event_types (
          id integer NOT NULL,
          name public.enum_event_types_name NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to event_types table
      ALTER SEQUENCE public.event_types_id_seq OWNED BY public.event_types.id;
      ALTER TABLE ONLY public.event_types ALTER COLUMN id SET DEFAULT nextval('public.event_types_id_seq'::regclass);

      -- Create events table
      CREATE TABLE public.events (
          id uuid NOT NULL,
          event_template_id integer NOT NULL,
          event_type_id integer NOT NULL,
          workflow_id uuid NOT NULL,
          cancellation_type_id integer,
          name character varying(255),
          done boolean DEFAULT false NOT NULL,
          created_by character varying(255) NOT NULL,
          updated_by character varying(255) NOT NULL,
          data json NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          document_id uuid,
          due_date timestamp with time zone,
          version character varying(255),
          lock_id character varying(255)
      );

      -- Create external_service_statuses table and its sequence
      CREATE SEQUENCE public.external_service_statuses_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.external_service_statuses (
          id integer NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          request_user character varying(255) NOT NULL,
          request_user_ip character varying(255) NOT NULL,
          request_url character varying(255) NOT NULL,
          status text NOT NULL,
          data_type public.external_service_statuses_status_data_type NOT NULL,
          state public.external_service_statuses_state NOT NULL,
          rejected_reason text
      );

      -- Link sequence to external_service_statuses table
      ALTER SEQUENCE public.external_service_statuses_id_seq OWNED BY public.external_service_statuses.id;
      ALTER TABLE ONLY public.external_service_statuses ALTER COLUMN id SET DEFAULT nextval('public.external_service_statuses_id_seq'::regclass);

      -- Add primary key constraints for event tables
      ALTER TABLE ONLY public.elastic_reindex_log ADD CONSTRAINT elastic_reindex_log_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.event_templates ADD CONSTRAINT event_templates_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.event_types ADD CONSTRAINT event_types_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.events ADD CONSTRAINT events_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.external_service_statuses ADD CONSTRAINT external_service_statuses_pkey PRIMARY KEY (id);
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS event_template_notify ON public.event_templates;
      DROP TABLE IF EXISTS public.elastic_reindex_log;
      DROP TABLE IF EXISTS public.external_service_statuses;
      DROP SEQUENCE IF EXISTS public.external_service_statuses_id_seq;
      DROP TABLE IF EXISTS public.events;
      DROP TABLE IF EXISTS public.event_types;
      DROP SEQUENCE IF EXISTS public.event_types_id_seq;
      DROP TABLE IF EXISTS public.event_templates;
      DROP SEQUENCE IF EXISTS public.event_templates_id_seq;
      DROP TABLE IF EXISTS public.elastic_reindex_log;
    `);
  }
};
