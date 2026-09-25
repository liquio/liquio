module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Create favorites table and its sequence
      CREATE SEQUENCE public.favorites_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.favorites (
          id integer NOT NULL,
          user_id character varying(255) NOT NULL,
          entity_type character varying(255) NOT NULL,
          entity_id character varying(255) NOT NULL,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL,
          name character varying(2048)
      );

      -- Link sequence to favorites table
      ALTER SEQUENCE public.favorites_id_seq OWNED BY public.favorites.id;
      ALTER TABLE ONLY public.favorites ALTER COLUMN id SET DEFAULT nextval('public.favorites_id_seq'::regclass);

      -- Create gateway_templates table and its sequence
      CREATE SEQUENCE public.gateway_templates_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.gateway_templates (
          id integer NOT NULL,
          gateway_type_id integer NOT NULL,
          name character varying(255) NOT NULL,
          description character varying(255),
          json_schema text NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to gateway_templates table
      ALTER SEQUENCE public.gateway_templates_id_seq OWNED BY public.gateway_templates.id;
      ALTER TABLE ONLY public.gateway_templates ALTER COLUMN id SET DEFAULT nextval('public.gateway_templates_id_seq'::regclass);

      -- Create trigger for gateway_templates table
      CREATE TRIGGER gateway_template_notify 
        AFTER INSERT OR DELETE OR UPDATE
        ON public.gateway_templates 
        FOR EACH ROW 
        EXECUTE FUNCTION generic_notify_event('gateway_template_row_change_notify');

      -- Create gateway_types table and its sequence
      CREATE SEQUENCE public.gateway_types_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.gateway_types (
          id integer NOT NULL,
          name public.enum_gateway_types_name NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to gateway_types table
      ALTER SEQUENCE public.gateway_types_id_seq OWNED BY public.gateway_types.id;
      ALTER TABLE ONLY public.gateway_types ALTER COLUMN id SET DEFAULT nextval('public.gateway_types_id_seq'::regclass);

      -- Create gateways table
      CREATE TABLE public.gateways (
          id uuid NOT NULL,
          gateway_template_id integer NOT NULL,
          gateway_type_id integer NOT NULL,
          workflow_id uuid NOT NULL,
          name character varying(255),
          created_by character varying(255) NOT NULL,
          updated_by character varying(255) NOT NULL,
          data json NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          version character varying(255)
      );

      -- Create kyc_sessions table
      CREATE TABLE public.kyc_sessions (
          id uuid NOT NULL,
          provider character varying(255) NOT NULL,
          "sessionId" character varying(255) NOT NULL,
          "userId" character varying(255) NOT NULL,
          "redirectUrl" character varying(255) NOT NULL,
          "returnUrl" character varying(255),
          data json,
          status character varying(255) NOT NULL,
          "createdAt" timestamp with time zone NOT NULL,
          "updatedAt" timestamp with time zone NOT NULL
      );

      -- Add primary key constraints for gateway and favorite tables
      ALTER TABLE ONLY public.gateway_templates ADD CONSTRAINT gateway_templates_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.gateway_types ADD CONSTRAINT gateway_types_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.gateways ADD CONSTRAINT gateways_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.kyc_sessions ADD CONSTRAINT kyc_sessions_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.favorites ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS gateway_template_notify ON public.gateway_templates;
      DROP TABLE IF EXISTS public.kyc_sessions;
      DROP TABLE IF EXISTS public.gateways;
      DROP TABLE IF EXISTS public.gateway_types;
      DROP SEQUENCE IF EXISTS public.gateway_types_id_seq;
      DROP TABLE IF EXISTS public.gateway_templates;
      DROP SEQUENCE IF EXISTS public.gateway_templates_id_seq;
      DROP TABLE IF EXISTS public.favorites;
      DROP SEQUENCE IF EXISTS public.favorites_id_seq;
    `);
  }
};
