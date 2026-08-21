module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Set default tablespace and table access method
      SET default_tablespace = '';
      SET default_table_access_method = heap;

      -- Create access_history table
      CREATE TABLE public.access_history (
          id uuid NOT NULL,
          user_id character varying(255),
          user_name character varying(255),
          ipn text,
          operation_type public.enum_access_history_operation_type,
          unit_id integer,
          unit_name character varying(255),
          init_user_id character varying(255),
          init_user_name character varying(255),
          init_ipn character varying(255),
          init_workflow_id uuid,
          init_workflow_name character varying(255),
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Create access_history_raw table
      CREATE TABLE public.access_history_raw (
          unit_id integer NOT NULL,
          created_by character varying(255) NOT NULL,
          created_at timestamp with time zone NOT NULL,
          operation_type public.enum_access_history_raw_operation_type,
          member text NOT NULL
      );

      -- Create additional_data_signatures table
      CREATE TABLE public.additional_data_signatures (
          id uuid NOT NULL,
          document_id uuid NOT NULL,
          data text NOT NULL,
          signature text NOT NULL,
          certificate text NOT NULL,
          created_by character varying(255) NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          crypt_certificate text,
          encrypted_data text,
          encrypted_data_certificate text,
          meta jsonb DEFAULT '{}'::jsonb NOT NULL
      );

      -- Create custom_interfaces table and its sequence
      CREATE SEQUENCE public.custom_interfaces_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.custom_interfaces (
          id integer NOT NULL,
          name character varying(255) NOT NULL,
          route character varying(255) NOT NULL,
          is_active boolean DEFAULT true NOT NULL,
          interface_schema text NOT NULL,
          units integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to custom_interfaces table
      ALTER SEQUENCE public.custom_interfaces_id_seq OWNED BY public.custom_interfaces.id;
      ALTER TABLE ONLY public.custom_interfaces ALTER COLUMN id SET DEFAULT nextval('public.custom_interfaces_id_seq'::regclass);

      -- Create custom_log_templates table and its sequence
      CREATE SEQUENCE public.custom_log_templates_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.custom_log_templates (
          id integer NOT NULL,
          name character varying(255) NOT NULL,
          document_template_id integer,
          operation_type public.enum_custom_log_templates_operation_type NOT NULL,
          schema text DEFAULT '(entity) => { return { type: ''Unknown type'', custom: [] }; }'::text NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          event_template_id integer,
          is_get_workflow_data boolean DEFAULT false
      );

      -- Link sequence to custom_log_templates table
      ALTER SEQUENCE public.custom_log_templates_id_seq OWNED BY public.custom_log_templates.id;
      ALTER TABLE ONLY public.custom_log_templates ALTER COLUMN id SET DEFAULT nextval('public.custom_log_templates_id_seq'::regclass);

      -- Create custom_logs table
      CREATE TABLE public.custom_logs (
          id uuid NOT NULL,
          custom_log_template_id integer,
          name character varying(255) NOT NULL,
          type character varying(255) NOT NULL,
          document_id uuid,
          request_id character varying(255),
          method character varying(255),
          url character varying(255),
          uri_pattern character varying(255),
          ip character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
          user_agent text,
          user_id character varying(255),
          user_name character varying(255),
          custom jsonb DEFAULT '{}'::jsonb NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Add primary key constraints for basic tables
      ALTER TABLE ONLY public.access_history ADD CONSTRAINT access_history_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.custom_interfaces ADD CONSTRAINT custom_interfaces_pkey PRIMARY KEY (id);

      -- Add unique constraint on route column for custom_interfaces
      ALTER TABLE ONLY public.custom_interfaces ADD CONSTRAINT custom_interfaces_route_unique UNIQUE (route);
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.custom_logs;
      DROP TABLE IF EXISTS public.custom_log_templates;
      DROP SEQUENCE IF EXISTS public.custom_log_templates_id_seq;
      DROP TABLE IF EXISTS public.custom_interfaces;
      DROP SEQUENCE IF EXISTS public.custom_interfaces_id_seq;
      DROP TABLE IF EXISTS public.additional_data_signatures;
      DROP TABLE IF EXISTS public.access_history_raw;
      DROP TABLE IF EXISTS public.access_history;
    `);
  }
};
