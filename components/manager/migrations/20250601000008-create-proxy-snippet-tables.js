module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Create proxy_items table and its sequence
      CREATE SEQUENCE public.proxy_items_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.proxy_items (
          id integer NOT NULL,
          name character varying(255) NOT NULL,
          data jsonb DEFAULT '{"link": null, "tags": [], "provider": null}'::jsonb NOT NULL,
          access_units integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to proxy_items table
      ALTER SEQUENCE public.proxy_items_id_seq OWNED BY public.proxy_items.id;
      ALTER TABLE ONLY public.proxy_items ALTER COLUMN id SET DEFAULT nextval('public.proxy_items_id_seq'::regclass);

      -- Create share_access table
      CREATE TABLE public.share_access (
          id uuid NOT NULL,
          share_from jsonb DEFAULT '{}'::jsonb NOT NULL,
          share_to jsonb DEFAULT '{}'::jsonb NOT NULL,
          access_type public.enum_share_access_access_type NOT NULL,
          access_details jsonb DEFAULT '{}'::jsonb NOT NULL,
          expire_date timestamp with time zone NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Create signature_removal_history table
      CREATE TABLE public.signature_removal_history (
          id uuid NOT NULL,
          signature_id uuid NOT NULL,
          signature_created_by character varying(255),
          signature_created_at timestamp with time zone NOT NULL,
          signature_updated_at timestamp with time zone,
          p7s text,
          file_name character varying(255),
          signature_type character varying(255) NOT NULL,
          document_id uuid NOT NULL,
          workflow_id uuid NOT NULL,
          user_id character varying(255) NOT NULL,
          user_name character varying(255) NOT NULL,
          created_at timestamp with time zone NOT NULL
      );

      -- Create snippet_groups table
      CREATE TABLE public.snippet_groups (
          name character varying(255) NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Create snippets table and its sequence
      CREATE SEQUENCE public.snippets_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.snippets (
          id integer NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL,
          snippet_group_name character varying(255),
          name character varying(255),
          type public.enum_snippets_type NOT NULL,
          data text,
          meta jsonb DEFAULT '{}'::jsonb NOT NULL
      );

      -- Link sequence to snippets table
      ALTER SEQUENCE public.snippets_id_seq OWNED BY public.snippets.id;
      ALTER TABLE ONLY public.snippets ALTER COLUMN id SET DEFAULT nextval('public.snippets_id_seq'::regclass);

      -- Add primary key constraints for proxy and snippet tables  
      ALTER TABLE ONLY public.proxy_items ADD CONSTRAINT proxy_items_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.share_access ADD CONSTRAINT share_access_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.signature_removal_history ADD CONSTRAINT signature_removal_history_pkey PRIMARY KEY (id);
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.snippets;
      DROP SEQUENCE IF EXISTS public.snippets_id_seq;
      DROP TABLE IF EXISTS public.snippet_groups;
      DROP TABLE IF EXISTS public.signature_removal_history;
      DROP TABLE IF EXISTS public.share_access;
      DROP TABLE IF EXISTS public.proxy_items;
      DROP SEQUENCE IF EXISTS public.proxy_items_id_seq;
    `);
  }
};
