-- Table: public.tbl_map_settings

-- DROP TABLE IF EXISTS public.tbl_map_settings;

CREATE TABLE IF NOT EXISTS public.tbl_map_settings
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    map_name character varying(250) COLLATE pg_catalog."default",
    changed_date timestamp with time zone DEFAULT now(),
    changed_by character varying(500) COLLATE pg_catalog."default",
    is_default boolean NOT NULL DEFAULT false,
    is_secured boolean NOT NULL DEFAULT false,
    allowed_roles text COLLATE pg_catalog."default",
    editor_roles text COLLATE pg_catalog."default",
    is_archived boolean NOT NULL DEFAULT false,
    description text COLLATE pg_catalog."default",
    CONSTRAINT tbl_map_settings_uuid_pk PRIMARY KEY (id),
    CONSTRAINT tbl_map_settings_map_name_unique UNIQUE (map_name)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tbl_map_settings
    OWNER to postgres;
-- Index: tbl_map_settings_new_trgm_idx_default

-- DROP INDEX IF EXISTS public.tbl_map_settings_new_trgm_idx_default;

CREATE INDEX IF NOT EXISTS tbl_map_settings_new_trgm_idx_default
    ON public.tbl_map_settings USING btree
    (is_default ASC NULLS LAST)
    TABLESPACE pg_default;