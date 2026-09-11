module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Create document_attachments table
      CREATE TABLE public.document_attachments (
          id uuid NOT NULL,
          document_id uuid NOT NULL,
          link character varying(255) NOT NULL,
          name character varying(255) NOT NULL,
          type character varying(255) NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          is_generated boolean DEFAULT false NOT NULL,
          labels character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[] NOT NULL,
          meta jsonb DEFAULT '{}'::jsonb NOT NULL,
          is_system boolean DEFAULT false NOT NULL,
          size integer DEFAULT 0
      );

      -- Create document_signature_rejections table
      CREATE TABLE public.document_signature_rejections (
          id uuid NOT NULL,
          document_id uuid NOT NULL,
          user_id text NOT NULL,
          data json NOT NULL,
          created_by character varying(255) NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Create document_signature_removal_history table
      CREATE TABLE public.document_signature_removal_history (
          id uuid NOT NULL,
          document_id uuid NOT NULL,
          workflow_id uuid NOT NULL,
          signature_id uuid NOT NULL,
          signature_created_by character varying(255) NOT NULL,
          signature_created_at timestamp with time zone NOT NULL,
          signature_type character varying(255) NOT NULL,
          user_id character varying(255) NOT NULL,
          user_name character varying(255) NOT NULL,
          created_at timestamp with time zone NOT NULL
      );

      -- Create document_signatures table
      CREATE TABLE public.document_signatures (
          id uuid NOT NULL,
          document_id uuid NOT NULL,
          signature text NOT NULL,
          certificate text NOT NULL,
          created_by character varying(255) NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          type character varying(255)
      );

      -- Create document_templates table and its sequence
      CREATE SEQUENCE public.document_templates_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.document_templates (
          id integer NOT NULL,
          name character varying(255) NOT NULL,
          json_schema text NOT NULL,
          html_template text NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          access_json_schema json DEFAULT '{}'::json NOT NULL,
          additional_data_to_sign text
      );

      -- Link sequence to document_templates table
      ALTER SEQUENCE public.document_templates_id_seq OWNED BY public.document_templates.id;
      ALTER TABLE ONLY public.document_templates ALTER COLUMN id SET DEFAULT nextval('public.document_templates_id_seq'::regclass);

      -- Create documents table
      CREATE TABLE public.documents (
          id uuid NOT NULL,
          parent_id uuid,
          document_template_id integer NOT NULL,
          document_state_id integer NOT NULL,
          cancellation_type_id integer,
          number character varying(255),
          is_final boolean DEFAULT false NOT NULL,
          owner_id character varying(255) NOT NULL,
          created_by character varying(255) NOT NULL,
          updated_by character varying(255) NOT NULL,
          data json NOT NULL,
          description character varying(255),
          file_id character varying(255),
          file_name character varying(255),
          file_type character varying(255),
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          asic json DEFAULT '{"asicmanifestFileId":null,"filesIds":[]}'::json NOT NULL,
          external_id character varying(255),
          file_size integer
      );

      -- Create triggers for document_templates table
      CREATE TRIGGER document_template_notify 
        AFTER INSERT OR DELETE OR UPDATE
        ON public.document_templates 
        FOR EACH ROW 
        EXECUTE FUNCTION generic_notify_event('document_template_row_change_notify');

      -- Add primary key constraints
      ALTER TABLE ONLY public.document_templates ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.documents ADD CONSTRAINT documents_pkey PRIMARY KEY (id);

      -- Create triggers for documents table
      CREATE TRIGGER document_updated 
        AFTER UPDATE
        ON public.documents 
        FOR EACH ROW 
        EXECUTE FUNCTION set_workflow_elastic_reindex_state_as_not_synced();
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS document_template_notify ON public.document_templates;
      DROP TRIGGER IF EXISTS document_updated ON public.documents;
      DROP TABLE IF EXISTS public.documents;
      DROP TABLE IF EXISTS public.document_templates;
      DROP SEQUENCE IF EXISTS public.document_templates_id_seq;
      DROP TABLE IF EXISTS public.document_signatures;
      DROP TABLE IF EXISTS public.document_signature_removal_history;
      DROP TABLE IF EXISTS public.document_signature_rejections;
      DROP TABLE IF EXISTS public.document_attachments;
    `);
  }
};
